import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SlicingSheet, SlicingSheetMaterialLine } from "@/types/slicing-sheet";
import type {
  ISlicingSheetRepository,
  UpsertSlicingSheetInput,
} from "../interfaces/slicing-sheet-repository.interface";

type SheetRow = Database["public"]["Tables"]["product_slicing_sheets"]["Row"];
type MaterialRow = Database["public"]["Tables"]["product_slicing_sheet_materials"]["Row"];

function toMaterialLine(row: MaterialRow): SlicingSheetMaterialLine {
  return {
    id: row.id,
    materialId: row.material_id,
    pieceGrams: row.piece_grams,
    supportGrams: row.support_grams,
  };
}

function toSlicingSheet(row: SheetRow, materials: MaterialRow[]): SlicingSheet {
  return {
    id: row.id,
    productId: row.product_id,
    printerId: row.printer_id,
    printHours: row.print_hours,
    materials: materials.filter((material) => material.slicing_sheet_id === row.id).map(toMaterialLine),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSlicingSheetRepository implements ISlicingSheetRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByProductId(productId: string): Promise<SlicingSheet[]> {
    const { data: sheets, error: sheetsError } = await this.supabase
      .from("product_slicing_sheets")
      .select("*")
      .eq("product_id", productId);
    if (sheetsError) throw sheetsError;
    if (!sheets || sheets.length === 0) return [];

    const { data: materials, error: materialsError } = await this.supabase
      .from("product_slicing_sheet_materials")
      .select("*")
      .in(
        "slicing_sheet_id",
        sheets.map((sheet) => sheet.id),
      );
    if (materialsError) throw materialsError;

    return sheets.map((sheet) => toSlicingSheet(sheet, materials ?? []));
  }

  async findByProductAndPrinter(productId: string, printerId: string): Promise<SlicingSheet | null> {
    const { data: sheet, error: sheetError } = await this.supabase
      .from("product_slicing_sheets")
      .select("*")
      .eq("product_id", productId)
      .eq("printer_id", printerId)
      .maybeSingle();
    if (sheetError) throw sheetError;
    if (!sheet) return null;

    const { data: materials, error: materialsError } = await this.supabase
      .from("product_slicing_sheet_materials")
      .select("*")
      .eq("slicing_sheet_id", sheet.id);
    if (materialsError) throw materialsError;

    return toSlicingSheet(sheet, materials ?? []);
  }

  // Substitui a ficha inteira (cabeçalho + linhas) numa sequência de
  // operações, não numa transação de banco única — mesmo padrão já aceito
  // em InventoryService.registerMaterialConsumption para operações
  // multi-tabela neste projeto.
  async upsert(input: UpsertSlicingSheetInput): Promise<SlicingSheet> {
    const { data: sheet, error: sheetError } = await this.supabase
      .from("product_slicing_sheets")
      .upsert(
        {
          product_id: input.productId,
          printer_id: input.printerId,
          print_hours: input.printHours,
          created_by: input.createdBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "product_id,printer_id" },
      )
      .select("*")
      .single();
    if (sheetError) throw sheetError;

    const { error: deleteError } = await this.supabase
      .from("product_slicing_sheet_materials")
      .delete()
      .eq("slicing_sheet_id", sheet.id);
    if (deleteError) throw deleteError;

    const { data: materials, error: insertError } = await this.supabase
      .from("product_slicing_sheet_materials")
      .insert(
        input.materials.map((material) => ({
          slicing_sheet_id: sheet.id,
          material_id: material.materialId,
          piece_grams: material.pieceGrams,
          support_grams: material.supportGrams,
        })),
      )
      .select("*");
    if (insertError) throw insertError;

    return toSlicingSheet(sheet, materials ?? []);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("product_slicing_sheets").delete().eq("id", id);
    if (error) throw error;
  }
}
