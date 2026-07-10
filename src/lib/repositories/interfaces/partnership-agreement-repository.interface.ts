import type { PartnershipAgreement } from "@/types/governance";

export interface CreatePartnershipAgreementInput {
  profitSplitRule: string;
  exitTerms?: string | null;
  createdBy: string | null;
}

export interface IPartnershipAgreementRepository {
  getCurrent(): Promise<PartnershipAgreement | null>;
  listHistory(): Promise<PartnershipAgreement[]>;
  create(input: CreatePartnershipAgreementInput): Promise<PartnershipAgreement>;
}
