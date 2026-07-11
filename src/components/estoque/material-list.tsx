"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MATERIAL_TYPE_LABEL } from "@/components/estoque/constants";
import { MaterialForm } from "@/components/estoque/material-form";
import { MaterialMovementForm } from "@/components/estoque/material-movement-form";
import { MaterialThresholdForm } from "@/components/estoque/material-threshold-form";
import { formatCurrency } from "@/lib/utils";
import type { Material, MaterialStockStatus } from "@/types/inventory";
import type { Printer } from "@/types/pricing";
import type { Product } from "@/types/catalog";

export interface MaterialRow {
  material: Material;
  status: MaterialStockStatus;
}

interface MaterialListProps {
  rows: MaterialRow[];
  printers: Printer[];
  products: Product[];
  canWrite: boolean;
}

export function MaterialList({ rows, printers, products, canWrite }: MaterialListProps) {
  const searchParams = useSearchParams();
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get("lowStock") === "1");

  const filteredRows = useMemo(
    () => (lowStockOnly ? rows.filter((row) => row.status.isLowStock) : rows),
    [rows, lowStockOnly],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Switch id="low-stock-filter" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
        <label htmlFor="low-stock-filter" className="text-sm text-muted-foreground">
          Somente estoque baixo
        </label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Custo de referência</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Limite mínimo</TableHead>
              {canWrite && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length ? (
              filteredRows.map(({ material, status }) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">
                    {material.name}
                    {status.isLowStock && (
                      <Badge variant="destructive" className="ml-2">
                        Estoque baixo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{MATERIAL_TYPE_LABEL[material.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{material.unit}</TableCell>
                  <TableCell>{formatCurrency(material.referenceCost)}</TableCell>
                  <TableCell>{status.balance}</TableCell>
                  <TableCell className="text-muted-foreground">{status.minimumQuantity ?? "—"}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <MaterialMovementForm material={material} printers={printers} products={products} />
                        <MaterialThresholdForm material={material} currentMinimum={status.minimumQuantity} />
                        <MaterialForm material={material} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  {lowStockOnly ? "Nenhum insumo em estoque baixo." : "Nenhum insumo encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
