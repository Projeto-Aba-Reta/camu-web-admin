import type { Repositories } from "@/lib/repositories";
import type {
  CreateCapitalContributionInput,
} from "@/lib/repositories/interfaces/capital-contribution-repository.interface";
import type {
  CreateDecisionLogEntryInput,
} from "@/lib/repositories/interfaces/decision-log-entry-repository.interface";
import type {
  CreateLegalEntityStatusInput,
} from "@/lib/repositories/interfaces/legal-entity-status-repository.interface";
import type {
  UpdateLegalMigrationTriggerInput,
} from "@/lib/repositories/interfaces/legal-migration-trigger-repository.interface";
import type {
  CreatePartnershipAgreementInput,
} from "@/lib/repositories/interfaces/partnership-agreement-repository.interface";
import type {
  CreateRevenueSnapshotInput,
  UpdateRevenueSnapshotInput,
  UpsertCeilingParameterInput,
} from "@/lib/repositories/interfaces/revenue-snapshot-repository.interface";
import type {
  CapitalContribution,
  DecisionLogEntry,
  LegalEntityStatus,
  LegalMigrationTrigger,
  MeiCeilingParameter,
  MeiCeilingStatus,
  PartnershipAgreement,
  RevenueSnapshot,
} from "@/types/governance";
import {
  DuplicateRevenueSnapshotError,
  MigrationTriggerRevertRequiresNoteError,
  TitularRequiredForMeiError,
} from "@/lib/errors/domain-errors";
import { AuditLogService, AUDIT_ACTIONS } from "./audit-log-service";

// Soma no máximo os últimos 12 valores (histórico parcial soma só os meses
// existentes) e divide pelo teto configurado. Função pura para poder ser
// testada sem depender do banco — replica o cálculo feito pela view
// mei_ceiling_status para consultas diretas.
export function calculateCeilingPercentage(
  monthlyRevenues: number[],
  annualCeiling: number,
): number | null {
  if (annualCeiling === 0) return null;
  const last12 = monthlyRevenues.slice(0, 12);
  const total = last12.reduce((sum, value) => sum + value, 0);
  return total / annualCeiling;
}

export class GovernanceService {
  constructor(
    private readonly repositories: Pick<
      Repositories,
      | "partnershipAgreements"
      | "capitalContributions"
      | "legalEntityStatus"
      | "legalMigrationTriggers"
      | "revenueSnapshots"
      | "decisionLogEntries"
      | "auditLog"
    >,
  ) {}

  getCurrentPartnershipAgreement(): Promise<PartnershipAgreement | null> {
    return this.repositories.partnershipAgreements.getCurrent();
  }

  listPartnershipAgreementHistory(): Promise<PartnershipAgreement[]> {
    return this.repositories.partnershipAgreements.listHistory();
  }

  async recordPartnershipAgreement(
    input: CreatePartnershipAgreementInput,
  ): Promise<PartnershipAgreement> {
    const agreement = await this.repositories.partnershipAgreements.create(input);
    await this.auditLog().record(
      input.createdBy,
      AUDIT_ACTIONS.PARTNERSHIP_AGREEMENT_CREATE,
      "partnership_agreements",
      agreement.id,
      { profitSplitRule: agreement.profitSplitRule },
    );
    return agreement;
  }

  listCapitalContributions(): Promise<CapitalContribution[]> {
    return this.repositories.capitalContributions.listAll();
  }

  listCapitalContributionsByPartner(partnerProfileId: string): Promise<CapitalContribution[]> {
    return this.repositories.capitalContributions.listByPartner(partnerProfileId);
  }

  async recordCapitalContribution(
    input: CreateCapitalContributionInput,
  ): Promise<CapitalContribution> {
    const contribution = await this.repositories.capitalContributions.create(input);
    await this.auditLog().record(
      input.createdBy,
      AUDIT_ACTIONS.CAPITAL_CONTRIBUTION_CREATE,
      "capital_contributions",
      contribution.id,
      { partnerProfileId: contribution.partnerProfileId, amount: contribution.amount },
    );
    return contribution;
  }

  getCurrentLegalEntityStatus(): Promise<LegalEntityStatus | null> {
    return this.repositories.legalEntityStatus.getCurrent();
  }

  listLegalEntityStatusHistory(): Promise<LegalEntityStatus[]> {
    return this.repositories.legalEntityStatus.listHistory();
  }

  async recordLegalEntityStatus(input: CreateLegalEntityStatusInput): Promise<LegalEntityStatus> {
    if (input.entityType === "mei" && !input.titularProfileId) {
      throw new TitularRequiredForMeiError(
        "Um titular é obrigatório para registrar um enquadramento do tipo MEI.",
      );
    }

    const status = await this.repositories.legalEntityStatus.create(input);
    await this.auditLog().record(
      input.createdBy,
      AUDIT_ACTIONS.LEGAL_ENTITY_STATUS_CREATE,
      "legal_entity_status",
      status.id,
      { entityType: status.entityType },
    );
    return status;
  }

  listMigrationTriggers(): Promise<LegalMigrationTrigger[]> {
    return this.repositories.legalMigrationTriggers.listAll();
  }

  async updateMigrationTrigger(
    input: UpdateLegalMigrationTriggerInput,
  ): Promise<LegalMigrationTrigger> {
    if (input.status === "pendente" && !input.notes) {
      throw new MigrationTriggerRevertRequiresNoteError(
        "Reverter um gatilho para pendente exige uma nota explicando o motivo.",
      );
    }

    const trigger = await this.repositories.legalMigrationTriggers.updateStatus(input);
    await this.auditLog().record(
      input.updatedBy,
      AUDIT_ACTIONS.LEGAL_MIGRATION_TRIGGER_UPDATE,
      "legal_migration_triggers",
      trigger.id,
      { triggerType: trigger.triggerType, status: trigger.status },
    );
    return trigger;
  }

  listRevenueSnapshots(): Promise<RevenueSnapshot[]> {
    return this.repositories.revenueSnapshots.listAll();
  }

  async recordRevenueSnapshot(input: CreateRevenueSnapshotInput): Promise<RevenueSnapshot> {
    const existing = await this.repositories.revenueSnapshots.findByMonth(input.referenceMonth);
    if (existing) {
      throw new DuplicateRevenueSnapshotError(
        `Já existe um lançamento de faturamento para o mês ${input.referenceMonth}. Atualize o lançamento existente em vez de criar um novo.`,
      );
    }

    const snapshot = await this.repositories.revenueSnapshots.create(input);
    await this.auditLog().record(
      input.createdBy,
      AUDIT_ACTIONS.REVENUE_SNAPSHOT_CREATE,
      "revenue_snapshots",
      snapshot.id,
      { referenceMonth: snapshot.referenceMonth, monthlyRevenue: snapshot.monthlyRevenue },
    );
    return snapshot;
  }

  async updateRevenueSnapshot(
    input: UpdateRevenueSnapshotInput,
    actorId: string | null,
  ): Promise<RevenueSnapshot> {
    const snapshot = await this.repositories.revenueSnapshots.update(input);
    await this.auditLog().record(
      actorId,
      AUDIT_ACTIONS.REVENUE_SNAPSHOT_UPDATE,
      "revenue_snapshots",
      snapshot.id,
      { referenceMonth: snapshot.referenceMonth, monthlyRevenue: snapshot.monthlyRevenue },
    );
    return snapshot;
  }

  async upsertCeilingParameter(input: UpsertCeilingParameterInput): Promise<MeiCeilingParameter> {
    const parameter = await this.repositories.revenueSnapshots.upsertCeilingParameter(input);
    await this.auditLog().record(
      input.createdBy,
      AUDIT_ACTIONS.MEI_CEILING_PARAMETER_UPSERT,
      "mei_ceiling_parameters",
      parameter.id,
      { year: parameter.year, annualCeiling: parameter.annualCeiling },
    );
    return parameter;
  }

  getCeilingStatus(): Promise<MeiCeilingStatus> {
    return this.repositories.revenueSnapshots.getCeilingStatus();
  }

  listDecisionLog(): Promise<DecisionLogEntry[]> {
    return this.repositories.decisionLogEntries.listAll();
  }

  async recordDecision(input: CreateDecisionLogEntryInput): Promise<DecisionLogEntry> {
    const entry = await this.repositories.decisionLogEntries.create(input);
    await this.auditLog().record(
      input.createdBy,
      AUDIT_ACTIONS.DECISION_LOG_ENTRY_CREATE,
      "decision_log_entries",
      entry.id,
      { title: entry.title },
    );
    return entry;
  }

  private auditLog(): AuditLogService {
    return new AuditLogService(this.repositories);
  }
}
