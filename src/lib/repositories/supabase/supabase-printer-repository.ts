import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Printer } from "@/types/pricing";
import type {
  CreatePrinterInput,
  IPrinterRepository,
} from "../interfaces/printer-repository.interface";

function toPrinter(row: Database["public"]["Tables"]["printers"]["Row"]): Printer {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    depreciationPerHour: row.depreciation_per_hour,
    isActive: row.is_active,
    validFrom: row.valid_from,
    createdBy: row.created_by,
  };
}

export class SupabasePrinterRepository implements IPrinterRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findActive(): Promise<Printer[]> {
    // Depreciação é versionada por (name, valid_from): a linha vigente de
    // cada máquina é a de maior valid_from para aquele name. Filtra por
    // essa linha antes de checar is_active, para não reviver uma máquina
    // cuja versão mais recente já foi desativada.
    const { data, error } = await this.supabase
      .from("printers")
      .select("*")
      .order("name", { ascending: true })
      .order("valid_from", { ascending: false });
    if (error) throw error;

    const currentByName = new Map<string, Database["public"]["Tables"]["printers"]["Row"]>();
    for (const row of data ?? []) {
      if (!currentByName.has(row.name)) currentByName.set(row.name, row);
    }

    return Array.from(currentByName.values())
      .filter((row) => row.is_active)
      .map(toPrinter);
  }

  async findById(id: string): Promise<Printer | null> {
    const { data, error } = await this.supabase
      .from("printers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toPrinter(data) : null;
  }

  async create(input: CreatePrinterInput): Promise<Printer> {
    const { data, error } = await this.supabase
      .from("printers")
      .insert({
        name: input.name,
        model: input.model,
        depreciation_per_hour: input.depreciationPerHour,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toPrinter(data);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase
      .from("printers")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
  }
}
