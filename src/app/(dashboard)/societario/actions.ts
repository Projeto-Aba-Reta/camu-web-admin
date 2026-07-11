"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { GovernanceService } from "@/lib/services/governance-service";
import { requireSocioOrOwner } from "@/lib/auth/require-socio-or-owner";
import {
  DuplicateRevenueSnapshotError,
  MigrationTriggerRevertRequiresNoteError,
  TitularRequiredForMeiError,
} from "@/lib/errors/domain-errors";
import type { MigrationTriggerStatus, MigrationTriggerType } from "@/types/governance";
import type {
  CapitalContributionFormValues,
  DecisionLogFormValues,
  LegalStatusFormValues,
  ProfitSplitFormValues,
  RevenueSnapshotFormValues,
} from "@/lib/validation/governance-schemas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function getGovernanceService(): Promise<GovernanceService> {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  return new GovernanceService(repositories);
}

// <input type="month"> retorna "YYYY-MM"; a coluna reference_month é o
// primeiro dia do mês.
function toReferenceMonthDate(month: string): string {
  return `${month}-01`;
}

export async function recordPartnershipAgreementAction(
  values: ProfitSplitFormValues,
): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.recordPartnershipAgreement({
      profitSplitRule: values.profitSplitRule,
      exitTerms: values.exitTerms || null,
      createdBy: user.id,
    });
    revalidatePath("/societario/acordo");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar a regra de divisão de lucro." };
  }
}

export async function recordCapitalContributionAction(
  values: CapitalContributionFormValues,
): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.recordCapitalContribution({
      partnerProfileId: values.partnerProfileId,
      amount: values.amount,
      contributionDate: values.contributionDate,
      proofReference: values.proofReference || null,
      createdBy: user.id,
    });
    revalidatePath("/societario/acordo");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível registrar a contribuição de capital." };
  }
}

export async function recordLegalEntityStatusAction(
  values: LegalStatusFormValues,
): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.recordLegalEntityStatus({
      entityType: values.entityType,
      cnpj: values.cnpj || null,
      titularProfileId: values.titularProfileId || null,
      createdBy: user.id,
    });
    revalidatePath("/societario/enquadramento");
    return { ok: true };
  } catch (error) {
    if (error instanceof TitularRequiredForMeiError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Não foi possível registrar o enquadramento jurídico." };
  }
}

export async function updateMigrationTriggerAction(
  triggerType: MigrationTriggerType,
  status: MigrationTriggerStatus,
  notes?: string,
): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.updateMigrationTrigger({
      triggerType,
      status,
      notes: notes || null,
      updatedBy: user.id,
    });
    revalidatePath("/societario/enquadramento");
    return { ok: true };
  } catch (error) {
    if (error instanceof MigrationTriggerRevertRequiresNoteError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Não foi possível atualizar o gatilho de migração." };
  }
}

export async function recordRevenueSnapshotAction(
  values: RevenueSnapshotFormValues,
): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.recordRevenueSnapshot({
      referenceMonth: toReferenceMonthDate(values.referenceMonth),
      monthlyRevenue: values.monthlyRevenue,
      notes: values.notes || null,
      createdBy: user.id,
    });
    revalidatePath("/societario/faturamento");
    return { ok: true };
  } catch (error) {
    if (error instanceof DuplicateRevenueSnapshotError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Não foi possível registrar o lançamento de faturamento." };
  }
}

export async function updateRevenueSnapshotAction(
  values: RevenueSnapshotFormValues,
): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.updateRevenueSnapshot(
      {
        referenceMonth: toReferenceMonthDate(values.referenceMonth),
        monthlyRevenue: values.monthlyRevenue,
        notes: values.notes || null,
      },
      user.id,
    );
    revalidatePath("/societario/faturamento");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o lançamento de faturamento." };
  }
}

export async function recordDecisionAction(values: DecisionLogFormValues): Promise<ActionResult> {
  try {
    const user = await requireSocioOrOwner();
    const governanceService = await getGovernanceService();
    await governanceService.recordDecision({
      title: values.title,
      context: values.context,
      decision: values.decision,
      alternativesConsidered: values.alternativesConsidered || null,
      reasoning: values.reasoning || null,
      decidedAt: values.decidedAt,
      createdBy: user.id,
    });
    revalidatePath("/societario/decisoes");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível registrar a nova entrada do log de decisões." };
  }
}
