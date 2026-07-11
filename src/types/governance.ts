export type LegalEntityType = "mei" | "me";

export type MigrationTriggerType =
  | "faturamento_proximo_teto"
  | "lancamento_assinatura_recorrente"
  | "necessidade_mais_funcionarios"
  | "investimento_externo";

export type MigrationTriggerStatus = "pendente" | "atingido";

export interface PartnershipAgreement {
  id: string;
  profitSplitRule: string;
  exitTerms: string | null;
  validFrom: string;
  createdBy: string | null;
}

export interface CapitalContribution {
  id: string;
  partnerProfileId: string;
  amount: number;
  contributionDate: string;
  proofReference: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LegalEntityStatus {
  id: string;
  entityType: LegalEntityType;
  cnpj: string | null;
  titularProfileId: string | null;
  validFrom: string;
  createdBy: string | null;
}

export interface LegalMigrationTrigger {
  id: string;
  triggerType: MigrationTriggerType;
  status: MigrationTriggerStatus;
  reachedAt: string | null;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface MeiCeilingParameter {
  id: string;
  year: number;
  annualCeiling: number;
  createdBy: string | null;
}

export interface RevenueSnapshot {
  id: string;
  referenceMonth: string;
  monthlyRevenue: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface MeiCeilingStatus {
  year: number;
  annualCeiling: number | null;
  revenueLast12Months: number;
  percentageReached: number | null;
}

export interface DecisionLogEntry {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternativesConsidered: string | null;
  reasoning: string | null;
  decidedAt: string;
  createdBy: string | null;
  createdAt: string;
}
