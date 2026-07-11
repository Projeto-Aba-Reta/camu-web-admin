import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Material } from "@/types/inventory";
import type {
  CreateMaterialInput,
  IMaterialRepository,
  UpdateMaterialInput,
} from "../interfaces/material-repository.interface";

function toMaterial(row: Database["public"]["Tables"]["materials"]["Row"]): Material {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Material["type"],
    unit: row.unit,
    referenceCost: row.reference_cost,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseMaterialRepository implements IMaterialRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Material | null> {
    const { data, error } = await this.supabase.from("materials").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toMaterial(data) : null;
  }

  async findAll(): Promise<Material[]> {
    const { data, error } = await this.supabase.from("materials").select("*").order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toMaterial);
  }

  async create(input: CreateMaterialInput): Promise<Material> {
    const { data, error } = await this.supabase
      .from("materials")
      .insert({
        name: input.name,
        type: input.type,
        unit: input.unit,
        reference_cost: input.referenceCost,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toMaterial(data);
  }

  async update(id: string, input: UpdateMaterialInput): Promise<Material> {
    const { data, error } = await this.supabase
      .from("materials")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.unit !== undefined && { unit: input.unit }),
        ...(input.referenceCost !== undefined && { reference_cost: input.referenceCost }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toMaterial(data);
  }
}
