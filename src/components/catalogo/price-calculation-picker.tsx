"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HistoricoRow } from "@/components/precificacao/historico-tabela";
import type { SizeTier } from "@/types/pricing";

const TIER_LABEL: Record<SizeTier, string> = { P: "P", M: "M", G: "G" };

function tierLabel(row: HistoricoRow): string {
  return row.suggestedTier.ambiguous
    ? row.suggestedTier.candidates.map((tier) => TIER_LABEL[tier]).join("/")
    : TIER_LABEL[row.suggestedTier.tier];
}

function matchesTierFilter(row: HistoricoRow, tierFilter: string): boolean {
  if (!tierFilter) return true;
  return row.suggestedTier.ambiguous
    ? row.suggestedTier.candidates.includes(tierFilter as SizeTier)
    : row.suggestedTier.tier === tierFilter;
}

interface PriceCalculationPickerProps {
  calculations: HistoricoRow[];
  onSelect: (calculation: HistoricoRow) => void;
}

// Autocomplete por data/porte sobre o histórico já calculado (ver
// design.md decisão 1) — nunca recalcula, só filtra o que já existe em
// `precificacao/historico`.
export function PriceCalculationPicker({ calculations, onSelect }: PriceCalculationPickerProps) {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  const filtered = useMemo(() => {
    return calculations.filter((row) => {
      const createdAt = new Date(row.createdAt);
      if (dateFrom && createdAt < new Date(dateFrom)) return false;
      if (dateTo && createdAt > new Date(`${dateTo}T23:59:59`)) return false;
      if (!matchesTierFilter(row, tierFilter)) return false;
      return true;
    });
  }, [calculations, dateFrom, dateTo, tierFilter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Buscar cálculo existente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar cálculo de preço</DialogTitle>
        </DialogHeader>

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
              <SelectTrigger className="w-28">
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

        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Impressora</TableHead>
                <TableHead>Porte</TableHead>
                <TableHead>Custo total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{row.printerName}</TableCell>
                    <TableCell>
                      <Badge variant={row.suggestedTier.ambiguous ? "outline" : "secondary"}>{tierLabel(row)}</Badge>
                    </TableCell>
                    <TableCell>R$ {row.totalCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onSelect(row);
                          setOpen(false);
                        }}
                      >
                        Selecionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    Nenhum cálculo encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
