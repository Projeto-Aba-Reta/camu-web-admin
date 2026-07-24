import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DuplicateSlugError } from "@/lib/errors/domain-errors";
import type { OrderPipelineStage } from "@/types/vendas";
import type {
  CreateOrderPipelineStageInput,
  IOrderPipelineStageRepository,
  UpdateOrderPipelineStageInput,
} from "../interfaces/order-pipeline-stage-repository.interface";

const UNIQUE_VIOLATION = "23505";

function toStage(
  row: Database["public"]["Tables"]["order_pipeline_stages"]["Row"],
): OrderPipelineStage {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
    color: row.color,
    isActive: row.is_active,
    isInitial: row.is_initial,
    isFinal: row.is_final,
    requiresPrinter: row.requires_printer,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseOrderPipelineStageRepository implements IOrderPipelineStageRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(onlyActive = false): Promise<OrderPipelineStage[]> {
    let query = this.supabase
      .from("order_pipeline_stages")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (onlyActive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toStage);
  }

  async findById(id: string): Promise<OrderPipelineStage | null> {
    const { data, error } = await this.supabase
      .from("order_pipeline_stages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toStage(data) : null;
  }

  async findBySlug(slug: string): Promise<OrderPipelineStage | null> {
    const { data, error } = await this.supabase
      .from("order_pipeline_stages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toStage(data) : null;
  }

  async findInitial(): Promise<OrderPipelineStage | null> {
    const { data, error } = await this.supabase
      .from("order_pipeline_stages")
      .select("*")
      .eq("is_initial", true)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data ? toStage(data) : null;
  }

  async create(input: CreateOrderPipelineStageInput): Promise<OrderPipelineStage> {
    const { data, error } = await this.supabase
      .from("order_pipeline_stages")
      .insert({
        slug: input.slug,
        name: input.name,
        sort_order: input.sortOrder,
        color: input.color,
        requires_printer: input.requiresPrinter,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new DuplicateSlugError(`Já existe uma etapa do funil com o slug "${input.slug}".`);
      }
      throw error;
    }
    return toStage(data);
  }

  async update(id: string, input: UpdateOrderPipelineStageInput): Promise<OrderPipelineStage> {
    const patch: Database["public"]["Tables"]["order_pipeline_stages"]["Update"] = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.color !== undefined) patch.color = input.color;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.isInitial !== undefined) patch.is_initial = input.isInitial;
    if (input.isFinal !== undefined) patch.is_final = input.isFinal;
    if (input.requiresPrinter !== undefined) patch.requires_printer = input.requiresPrinter;

    const { data, error } = await this.supabase
      .from("order_pipeline_stages")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toStage(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("order_pipeline_stages").delete().eq("id", id);
    if (error) throw error;
  }

  async reorder(positions: { id: string; sortOrder: number }[]): Promise<void> {
    // Sem índice único em sort_order (ver migration), então updates
    // sequenciais não colidem entre si — o serviço já entrega as posições
    // normalizadas e distintas.
    for (const position of positions) {
      const { error } = await this.supabase
        .from("order_pipeline_stages")
        .update({ sort_order: position.sortOrder })
        .eq("id", position.id);
      if (error) throw error;
    }
  }

  async countOrders(id: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("pipeline_stage_id", id);
    if (error) throw error;
    return count ?? 0;
  }
}
