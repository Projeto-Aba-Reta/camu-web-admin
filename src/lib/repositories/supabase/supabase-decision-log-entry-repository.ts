import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DecisionLogEntry } from "@/types/governance";
import type {
  CreateDecisionLogEntryInput,
  IDecisionLogEntryRepository,
} from "../interfaces/decision-log-entry-repository.interface";

function toEntry(
  row: Database["public"]["Tables"]["decision_log_entries"]["Row"],
): DecisionLogEntry {
  return {
    id: row.id,
    title: row.title,
    context: row.context,
    decision: row.decision,
    alternativesConsidered: row.alternatives_considered,
    reasoning: row.reasoning,
    decidedAt: row.decided_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseDecisionLogEntryRepository implements IDecisionLogEntryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(): Promise<DecisionLogEntry[]> {
    const { data, error } = await this.supabase
      .from("decision_log_entries")
      .select("*")
      .order("decided_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toEntry);
  }

  async create(input: CreateDecisionLogEntryInput): Promise<DecisionLogEntry> {
    const { data, error } = await this.supabase
      .from("decision_log_entries")
      .insert({
        title: input.title,
        context: input.context,
        decision: input.decision,
        alternatives_considered: input.alternativesConsidered ?? null,
        reasoning: input.reasoning ?? null,
        decided_at: input.decidedAt,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toEntry(data);
  }
}
