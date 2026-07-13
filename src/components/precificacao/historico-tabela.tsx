"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHANNEL_LABEL } from "@/components/precificacao/canal-fee-form";
import { ResultadoCalculo } from "@/components/shared/resultado-calculo";
import type { PriceCalculation, SizeTier } from "@/types/pricing";

const TIER_LABEL: Record<SizeTier, string> = { P: "P", M: "M", G: "G" };

export interface HistoricoRow extends PriceCalculation {
  printerName: string;
}

// null: cálculo de peça composta, sem porte único a classificar (ver
// Requirement "Cálculo de custo agregado para peça composta").
function tierLabel(calculation: PriceCalculation): string {
  if (!calculation.suggestedTier) return "—";
  return calculation.suggestedTier.ambiguous
    ? calculation.suggestedTier.candidates.map((tier) => TIER_LABEL[tier]).join("/")
    : TIER_LABEL[calculation.suggestedTier.tier];
}

function matchesTierFilter(calculation: PriceCalculation, tierFilter: string): boolean {
  if (!tierFilter) return true;
  if (!calculation.suggestedTier) return false;
  return calculation.suggestedTier.ambiguous
    ? calculation.suggestedTier.candidates.includes(tierFilter as SizeTier)
    : calculation.suggestedTier.tier === tierFilter;
}

function productLabel(calculation: PriceCalculation, productNames: Record<string, string>): string {
  if (calculation.componentBreakdown) return productNames[calculation.productId ?? ""] ?? "Peça composta";
  if (!calculation.productId) return "Avulso";
  return productNames[calculation.productId] ?? "—";
}

interface HistoricoTabelaProps {
  rows: HistoricoRow[];
  // id da peça -> nome, para exibir de qual peça é o cálculo (ex.: um boneco)
  // e nomear os componentes ao reabrir o resultado de uma peça composta.
  productNames: Record<string, string>;
}

export function HistoricoTabela({ rows, productNames }: HistoricoTabelaProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");
  // Cálculo aberto no diálogo de detalhe: reexibe o resultado salvo, sem
  // recalcular com os parâmetros vigentes atuais.
  const [selected, setSelected] = useState<HistoricoRow | null>(null);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const createdAt = new Date(row.createdAt);
      if (dateFrom && createdAt < new Date(dateFrom)) return false;
      if (dateTo && createdAt > new Date(`${dateTo}T23:59:59`)) return false;
      if (!matchesTierFilter(row, tierFilter)) return false;
      return true;
    });
  }, [rows, dateFrom, dateTo, tierFilter]);

  const columns = useMemo<ColumnDef<HistoricoRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Quando",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString("pt-BR")}
          </span>
        ),
      },
      {
        id: "peca",
        header: "Peça",
        cell: ({ row }) => productLabel(row.original, productNames),
      },
      {
        id: "pesoTempo",
        header: "Peso / Tempo",
        cell: ({ row }) =>
          row.original.weightGrams !== null && row.original.printHours !== null
            ? `${row.original.weightGrams}g / ${row.original.printHours}h`
            : "Peça composta",
      },
      {
        accessorKey: "printerName",
        header: "Impressora",
      },
      {
        id: "porte",
        header: "Porte",
        cell: ({ row }) => (
          <Badge variant={row.original.suggestedTier?.ambiguous ? "outline" : "secondary"}>
            {tierLabel(row.original)}
          </Badge>
        ),
      },
      {
        accessorKey: "totalCost",
        header: "Custo total",
        cell: ({ row }) => `R$ ${row.original.totalCost.toFixed(2)}`,
      },
      {
        id: "precos",
        header: "Preço por canal",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.channelPrices
              .map((price) => `${CHANNEL_LABEL[price.channel]} R$ ${price.suggestedPrice.toFixed(2)}`)
              .join(" · ") || "—"}
          </span>
        ),
      },
      {
        id: "acoes",
        header: "",
        cell: ({ row }) => (
          <Button type="button" size="sm" variant="outline" onClick={() => setSelected(row.original)}>
            Ver cálculo
          </Button>
        ),
      },
    ],
    [productNames],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Porte</label>
          <Select value={tierFilter || "all"} onValueChange={(value) => setTierFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="P">P</SelectItem>
              <SelectItem value="M">M</SelectItem>
              <SelectItem value="G">G</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Nenhum cálculo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `Cálculo de ${productLabel(selected, productNames)}` : "Cálculo"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.createdAt).toLocaleString("pt-BR")} · {selected.printerName}
                {selected.weightGrams !== null && selected.printHours !== null
                  ? ` · ${selected.weightGrams}g / ${selected.printHours}h`
                  : " · Peça composta"}
              </p>
              <p className="text-xs text-muted-foreground">
                Resultado exatamente como registrado no momento do cálculo — não recalculado com os
                parâmetros vigentes atuais.
              </p>
              <ResultadoCalculo result={selected} saved componentNames={productNames} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
