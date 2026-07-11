import type { LegalEntityStatus, LegalEntityType } from "@/types/governance";

export interface CreateLegalEntityStatusInput {
  entityType: LegalEntityType;
  cnpj?: string | null;
  titularProfileId?: string | null;
  createdBy: string | null;
}

export interface ILegalEntityStatusRepository {
  getCurrent(): Promise<LegalEntityStatus | null>;
  listHistory(): Promise<LegalEntityStatus[]>;
  create(input: CreateLegalEntityStatusInput): Promise<LegalEntityStatus>;
}
