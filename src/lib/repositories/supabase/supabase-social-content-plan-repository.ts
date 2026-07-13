import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  SocialChannel,
  SocialContentPlanItem,
  SocialContentStatus,
  SocialContentStatusEvent,
} from "@/types/marketing";
import type {
  CreateSocialContentPlanItemInput,
  ISocialContentPlanRepository,
  RecordStatusEventInput,
  UpdateSocialContentPlanItemInput,
} from "../interfaces/social-content-plan-repository.interface";

type ItemRow = Database["public"]["Tables"]["social_content_plan_items"]["Row"];
type ChannelRow = Database["public"]["Tables"]["social_content_plan_item_channels"]["Row"];

function toPlanItem(row: ItemRow, channelRows: ChannelRow[]): SocialContentPlanItem {
  return {
    id: row.id,
    commemorativeDateId: row.commemorative_date_id,
    title: row.title,
    channels: channelRows
      .filter((channelRow) => channelRow.item_id === row.id)
      .map((channelRow) => channelRow.channel as SocialChannel),
    status: row.status as SocialContentStatus,
    responsibleId: row.responsible_id,
    targetDate: row.target_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toStatusEvent(
  row: Database["public"]["Tables"]["social_content_plan_status_events"]["Row"],
): SocialContentStatusEvent {
  return {
    id: row.id,
    itemId: row.item_id,
    fromStatus: row.from_status as SocialContentStatus,
    toStatus: row.to_status as SocialContentStatus,
    changedBy: row.changed_by,
    changedAt: row.changed_at,
  };
}

export class SupabaseSocialContentPlanRepository implements ISocialContentPlanRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  // Canais vivem em tabela de junção — busca separada e junção em memória,
  // mesmo padrão de SupabaseSlicingSheetRepository com seus materiais.
  private async findChannels(itemIds: string[]): Promise<ChannelRow[]> {
    if (itemIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("social_content_plan_item_channels")
      .select("*")
      .in("item_id", itemIds);
    if (error) throw error;
    return data ?? [];
  }

  private async replaceChannels(itemId: string, channels: SocialChannel[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from("social_content_plan_item_channels")
      .delete()
      .eq("item_id", itemId);
    if (deleteError) throw deleteError;

    const { error: insertError } = await this.supabase
      .from("social_content_plan_item_channels")
      .insert(channels.map((channel) => ({ item_id: itemId, channel })));
    if (insertError) throw insertError;
  }

  private async hydrate(rows: ItemRow[]): Promise<SocialContentPlanItem[]> {
    const channelRows = await this.findChannels(rows.map((row) => row.id));
    return rows.map((row) => toPlanItem(row, channelRows));
  }

  async findById(id: string): Promise<SocialContentPlanItem | null> {
    const { data, error } = await this.supabase
      .from("social_content_plan_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    return toPlanItem(data, await this.findChannels([data.id]));
  }

  async listByStatus(statuses?: SocialContentStatus[]): Promise<SocialContentPlanItem[]> {
    let query = this.supabase
      .from("social_content_plan_items")
      .select("*")
      .order("created_at", { ascending: true });
    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }
    const { data, error } = await query;
    if (error) throw error;
    return this.hydrate(data ?? []);
  }

  async listByTargetDateRange(from: string, to: string): Promise<SocialContentPlanItem[]> {
    const { data, error } = await this.supabase
      .from("social_content_plan_items")
      .select("*")
      .gte("target_date", from)
      .lte("target_date", to)
      .order("target_date", { ascending: true });
    if (error) throw error;
    return this.hydrate(data ?? []);
  }

  async create(input: CreateSocialContentPlanItemInput): Promise<SocialContentPlanItem> {
    const { data, error } = await this.supabase
      .from("social_content_plan_items")
      .insert({
        commemorative_date_id: input.commemorativeDateId,
        title: input.title,
        responsible_id: input.responsibleId,
        target_date: input.targetDate,
        notes: input.notes,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;

    await this.replaceChannels(data.id, input.channels);
    return toPlanItem(data, await this.findChannels([data.id]));
  }

  async update(id: string, input: UpdateSocialContentPlanItemInput): Promise<SocialContentPlanItem> {
    const patch: Database["public"]["Tables"]["social_content_plan_items"]["Update"] = {};
    if (input.commemorativeDateId !== undefined) patch.commemorative_date_id = input.commemorativeDateId;
    if (input.title !== undefined) patch.title = input.title;
    if (input.status !== undefined) patch.status = input.status;
    if (input.responsibleId !== undefined) patch.responsible_id = input.responsibleId;
    if (input.targetDate !== undefined) patch.target_date = input.targetDate;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await this.supabase
      .from("social_content_plan_items")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    if (input.channels !== undefined) {
      await this.replaceChannels(id, input.channels);
    }

    return toPlanItem(data, await this.findChannels([id]));
  }

  async recordStatusEvent(input: RecordStatusEventInput): Promise<SocialContentStatusEvent> {
    const { data, error } = await this.supabase
      .from("social_content_plan_status_events")
      .insert({
        item_id: input.itemId,
        from_status: input.fromStatus,
        to_status: input.toStatus,
        changed_by: input.changedBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toStatusEvent(data);
  }

  async listStatusEvents(itemId: string): Promise<SocialContentStatusEvent[]> {
    const { data, error } = await this.supabase
      .from("social_content_plan_status_events")
      .select("*")
      .eq("item_id", itemId)
      .order("changed_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toStatusEvent);
  }
}
