"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORY_LABEL } from "@/components/catalogo/constants";
import { ProductMovementForm } from "@/components/estoque/product-movement-form";
import type { Product } from "@/types/catalog";

export interface ProductStockRow {
  product: Product;
  balance: number;
}

interface ProductStockListProps {
  rows: ProductStockRow[];
  canWrite: boolean;
}

export function ProductStockList({ rows, canWrite }: ProductStockListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Peça</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Saldo disponível</TableHead>
            {canWrite && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map(({ product, balance }) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{CATEGORY_LABEL[product.category]}</TableCell>
                <TableCell>{balance}</TableCell>
                {canWrite && (
                  <TableCell>
                    <div className="flex justify-end">
                      <ProductMovementForm product={product} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={canWrite ? 4 : 3} className="h-24 text-center text-muted-foreground">
                Nenhuma peça cadastrada no catálogo ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
