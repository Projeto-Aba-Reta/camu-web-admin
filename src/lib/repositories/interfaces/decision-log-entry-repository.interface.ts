import type { DecisionLogEntry } from "@/types/governance";

export interface CreateDecisionLogEntryInput {
  title: string;
  context: string;
  decision: string;
  alternativesConsidered?: string | null;
  reasoning?: string | null;
  decidedAt: string;
  createdBy: string | null;
}

export interface IDecisionLogEntryRepository {
  listAll(): Promise<DecisionLogEntry[]>;
  create(input: CreateDecisionLogEntryInput): Promise<DecisionLogEntry>;
}
