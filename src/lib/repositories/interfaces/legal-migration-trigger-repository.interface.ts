import type {
  LegalMigrationTrigger,
  MigrationTriggerStatus,
  MigrationTriggerType,
} from "@/types/governance";

export interface UpdateLegalMigrationTriggerInput {
  triggerType: MigrationTriggerType;
  status: MigrationTriggerStatus;
  notes?: string | null;
  updatedBy: string | null;
}

export interface ILegalMigrationTriggerRepository {
  listAll(): Promise<LegalMigrationTrigger[]>;
  updateStatus(input: UpdateLegalMigrationTriggerInput): Promise<LegalMigrationTrigger>;
}
