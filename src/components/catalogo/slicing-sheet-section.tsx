"use client";

import { Layers, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlicingSheetForm } from "@/components/catalogo/slicing-sheet-form";
import type { Material } from "@/types/inventory";
import type { Printer } from "@/types/pricing";
import type { SlicingSheet } from "@/types/slicing-sheet";

export interface SlicingSheetRow {
  sheet: SlicingSheet;
  weightGrams: number;
}

interface SlicingSheetSectionProps {
  productId: string;
  rows: SlicingSheetRow[];
  printers: Printer[];
  materials: Material[];
  canWrite: boolean;
}

export function SlicingSheetSection({ productId, rows, printers, materials, canWrite }: SlicingSheetSectionProps) {
  const printerById = new Map(printers.map((printer) => [printer.id, printer]));
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const registeredPrinterIds = new Set(rows.map((row) => row.sheet.printerId));
  const availablePrinters = printers.filter((printer) => !registeredPrinterIds.has(printer.id));

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ficha de fatiamento</h3>
          <p className="text-xs text-muted-foreground">
            Dados exportados pela fatiadora por impressora — necessário para a peça entrar na fila de impressão.
          </p>
        </div>
        {canWrite && availablePrinters.length > 0 && (
          <SlicingSheetForm
            productId={productId}
            printers={availablePrinters}
            materials={materials}
            trigger={
              <Button type="button" size="sm" variant="outline">
                <Layers className="size-4" />
                Nova ficha
              </Button>
            }
          />
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma ficha de fatiamento cadastrada ainda. Cadastre pelo menos uma para permitir que esta peça entre na
          fila de impressão.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ sheet, weightGrams }) => (
            <div key={sheet.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {printerById.get(sheet.printerId)?.name ?? "Impressora"}
                  </span>
                  <Badge variant="secondary">{sheet.printHours}h de impressão</Badge>
                  <Badge variant="secondary">{weightGrams}g na peça</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {sheet.materials
                    .map((material) => {
                      const name = materialById.get(material.materialId)?.name ?? material.materialId;
                      return `${name}: ${material.pieceGrams}g na peça + ${material.supportGrams}g em suporte`;
                    })
                    .join(" · ")}
                </div>
              </div>
              {canWrite && (
                <SlicingSheetForm
                  productId={productId}
                  printers={printers}
                  materials={materials}
                  existingSheet={sheet}
                  trigger={
                    <Button type="button" size="sm" variant="ghost">
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
