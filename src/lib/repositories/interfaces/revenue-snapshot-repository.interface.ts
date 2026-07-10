import type { MeiCeilingParameter, MeiCeilingStatus, RevenueSnapshot } from "@/types/governance";

export interface CreateRevenueSnapshotInput {
  referenceMonth: string;
  monthlyRevenue: number;
  notes?: string | null;
  createdBy: string | null;
}

export interface UpdateRevenueSnapshotInput {
  referenceMonth: string;
  monthlyRevenue: number;
  notes?: string | null;
}

export interface UpsertCeilingParameterInput {
  year: number;
  annualCeiling: number;
  createdBy: string | null;
}

// Também expõe mei_ceiling_parameters: a capability
// "acompanhamento-de-faturamento-x-teto" trata lançamento mensal e teto
// configurável como uma unidade só (ver openspec spec desta capability).
export interface IRevenueSnapshotRepository {
  listAll(): Promise<RevenueSnapshot[]>;
  findByMonth(referenceMonth: string): Promise<RevenueSnapshot | null>;
  create(input: CreateRevenueSnapshotInput): Promise<RevenueSnapshot>;
  update(input: UpdateRevenueSnapshotInput): Promise<RevenueSnapshot>;
  getCeilingForYear(year: number): Promise<MeiCeilingParameter | null>;
  upsertCeilingParameter(input: UpsertCeilingParameterInput): Promise<MeiCeilingParameter>;
  getCeilingStatus(): Promise<MeiCeilingStatus>;
}
