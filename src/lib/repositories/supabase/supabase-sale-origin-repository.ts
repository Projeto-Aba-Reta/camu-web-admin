import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DuplicateSlugError } from "@/lib/errors/domain-errors";
import type { SaleOrigin } from "@/types/vendas";
import type {
  CreateSaleOriginInput,
  ISaleOriginRepository,
  UpdateSaleOriginInput,
} from "../interfaces/sale-origin-repository.interface";

const UNIQUE_VIOLATION = "23505";

function toSaleOrigin(row: Database["public"]["Tables"]["sale_origins"]["Row"]): SaleOrigin {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    requiresSeller: row.requires_seller,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseSaleOriginRepository implements ISaleOriginRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async listAll(onlyActive = false): Promise<SaleOrigin[]> {
    let query = this.supabase
      .from("sale_origins")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (onlyActive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toSaleOrigin);
  }

  async findById(id: string): Promise<SaleOrigin | null> {
    const { data, error } = await this.supabase
      .from("sale_origins")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toSaleOrigin(data) : null;
  }

  async findBySlug(slug: string): Promise<SaleOrigin | null> {
    const { data, error } = await this.supabase
      .from("sale_origins")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toSaleOrigin(data) : null;
  }

  async create(input: CreateSaleOriginInput): Promise<SaleOrigin> {
    const { data, error } = await this.supabase
      .from("sale_origins")
      .insert({
        slug: input.slug,
        name: input.name,
        sort_order: input.sortOrder,
        requires_seller: input.requiresSeller,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new DuplicateSlugError(`Já existe uma origem de venda com o slug "${input.slug}".`);
      }
      throw error;
    }
    return toSaleOrigin(data);
  }

  async update(id: string, input: UpdateSaleOriginInput): Promise<SaleOrigin> {
    const patch: Database["public"]["Tables"]["sale_origins"]["Update"] = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.requiresSeller !== undefined) patch.requires_seller = input.requiresSeller;

    const { data, error } = await this.supabase
      .from("sale_origins")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toSaleOrigin(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("sale_origins").delete().eq("id", id);
    if (error) throw error;
  }

  async countOrders(id: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("sale_origin_id", id);
    if (error) throw error;
    return count ?? 0;
  }
}
