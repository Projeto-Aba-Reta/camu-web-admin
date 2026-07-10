import type { CapitalContribution } from "@/types/governance";

export interface CreateCapitalContributionInput {
  partnerProfileId: string;
  amount: number;
  contributionDate: string;
  proofReference?: string | null;
  createdBy: string | null;
}

export interface ICapitalContributionRepository {
  listAll(): Promise<CapitalContribution[]>;
  listByPartner(partnerProfileId: string): Promise<CapitalContribution[]>;
  create(input: CreateCapitalContributionInput): Promise<CapitalContribution>;
}
