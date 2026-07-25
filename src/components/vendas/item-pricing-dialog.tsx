"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNEL_LABEL } from "@/lib/pricing/channel-label";
import { tierLabel } from "@/lib/pricing/tier-label";
import { formatCents } from "@/components/vendas/labels";
import {
  calculateChannelPrice,
  calculateCostBreakdown,
  classifyTier,
  findTierRange,
  resolveB2cMargin,
  resolveEffectiveMargin,
  sumCostBreakdown,
} from "@/lib/services/pricing-formula";
import type {
  ChannelFee,
  CostParameters,
  Printer,
  SizeTierDefinition,
  SizeTierRange,
} from "@/types/pricing";

// Precificação simples: a MESMA fórmula do motor (pricing-formula.ts), rodada
// sobre peso/tempo digitados na hora da venda. Serve o item que não está no
// catálogo — encomenda sob medida não tem ficha de fatiamento nem preço de
// tabela, mas o custo dela precisa entrar no lucro do pedido.
//
// Nada é persistido aqui: o resultado volta para a linha do item, e é a
// gravação do pedido que transforma o custo em lançamento de custo real.

export interface SimplePricingInputs {
  costParameters: CostParameters | null;
  printers: Printer[];
  channelFees: ChannelFee[];
  sizeTierRanges: SizeTierRange[];
  sizeTiers: SizeTierDefinition[];
}

interface ItemPricingDialogProps {
  pricing: SimplePricingInputs;
  // Nome digitado do item, só para dar título ao diálogo.
  itemName: string;
  onApply: (result: { unitPriceCents: number; unitCostCents: number }) => void;
}

const DIRECT_SALE = "__direta__";

function parseNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

export function ItemPricingDialog({ pricing, itemName, onApply }: ItemPricingDialogProps) {
  const { costParameters, printers, channelFees, sizeTierRanges, sizeTiers } = pricing;

  const [open, setOpen] = useState(false);
  const [weightGrams, setWeightGrams] = useState("40");
  const [printHours, setPrintHours] = useState("3");
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? "");
  const [channel, setChannel] = useState<string>(DIRECT_SALE);
  // Vazio = usa a margem sugerida pelo porte. O precificador pode sobrepor
  // sem alterar os parâmetros vigentes, que valem para o catálogo inteiro.
  const [marginOverride, setMarginOverride] = useState("");

  const printer = printers.find((candidate) => candidate.id === printerId) ?? null;
  const weight = parseNumber(weightGrams);
  const hours = parseNumber(printHours);

  const missing: string | null = !costParameters
    ? "Cadastre os parâmetros de custo em Financeiro › Precificação antes de precificar aqui."
    : !printer
      ? "Cadastre ao menos uma impressora ativa para precificar."
      : null;

  // Classificação de porte só serve para sugerir a margem: peso/tempo fora de
  // qualquer faixa não impede precificar, apenas deixa a sugestão sem porte.
  let suggestedTier: string | null = null;
  if (sizeTierRanges.length > 0 && weight > 0 && hours > 0) {
    try {
      const classification = classifyTier(weight, hours, sizeTierRanges, sizeTiers);
      suggestedTier = classification.ambiguous ? classification.candidates[0] : classification.tier;
    } catch {
      suggestedTier = null;
    }
  }

  const range = suggestedTier ? findTierRange(sizeTierRanges, suggestedTier) : null;
  const suggestedMargin = costParameters
    ? resolveB2cMargin(costParameters.targetMarginPct, range)
    : null;

  const effectiveMargin =
    marginOverride.trim() === ""
      ? suggestedMargin
      : resolveEffectiveMargin(parseNumber(marginOverride) / 100, 0, "somar");

  const fee = channelFees.find((candidate) => candidate.channel === channel) ?? null;

  let result: { totalCost: number; suggestedPrice: number; margin: number } | null = null;
  let error: string | null = null;
  if (costParameters && printer && effectiveMargin && weight > 0 && hours > 0) {
    try {
      const breakdown = calculateCostBreakdown(
        weight,
        hours,
        printer.depreciationPerHour,
        costParameters,
      );
      const totalCost = sumCostBreakdown(breakdown);
      // Venda direta é o canal sem taxa: a mesma conta com taxa 0 dá
      // custo × (1 + margem), sem uma segunda fórmula para manter.
      const priced = calculateChannelPrice(
        totalCost,
        effectiveMargin,
        fee?.percentageFee ?? 0,
        fee?.fixedFee ?? 0,
      );
      result = { totalCost, ...priced };
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Não foi possível calcular com estes valores.";
    }
  }

  function handleApply() {
    if (!result) return;
    onApply({
      unitPriceCents: toCents(result.suggestedPrice),
      unitCostCents: toCents(result.totalCost),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Calculator className="size-4" />
          Precificar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Precificar {itemName.trim() || "item fora do catálogo"}</DialogTitle>
          <DialogDescription>
            Mesma fórmula do motor de precificação, sobre o peso e o tempo desta peça. Ao aplicar, o
            preço vai para o item e o custo entra no custo real do pedido.
          </DialogDescription>
        </DialogHeader>

        {missing ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
            {missing}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="preco-peso">Peso (g)</Label>
                <Input
                  id="preco-peso"
                  inputMode="decimal"
                  value={weightGrams}
                  onChange={(event) => setWeightGrams(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preco-tempo">Tempo de impressão (h)</Label>
                <Input
                  id="preco-tempo"
                  inputMode="decimal"
                  value={printHours}
                  onChange={(event) => setPrintHours(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Impressora</Label>
                <Select value={printerId} onValueChange={setPrinterId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a impressora" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Sem taxa: venda de feira, boca-a-boca, entrega em mãos. */}
                    <SelectItem value={DIRECT_SALE}>Venda direta (sem taxa)</SelectItem>
                    {channelFees.map((candidate) => (
                      <SelectItem key={candidate.channel} value={candidate.channel}>
                        {CHANNEL_LABEL[candidate.channel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="preco-margem">Margem (%)</Label>
                <Input
                  id="preco-margem"
                  inputMode="decimal"
                  placeholder={
                    suggestedMargin
                      ? `sugerida: ${(suggestedMargin.effectivePct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`
                      : "ex.: 60"
                  }
                  value={marginOverride}
                  onChange={(event) => setMarginOverride(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Em branco usa a margem-alvo vigente somada à do porte
                  {suggestedTier ? ` (${tierLabel(suggestedTier, sizeTiers)})` : ""}. Preencher vale
                  só para este item — os parâmetros do catálogo não mudam.
                </p>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
                {error}
              </p>
            )}

            {result ? (
              <dl className="space-y-1 rounded-md border p-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Custo</dt>
                  <dd>{formatCents(toCents(result.totalCost))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Lucro</dt>
                  <dd>{formatCents(toCents(result.margin))}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Preço final</dt>
                  <dd>{formatCents(toCents(result.suggestedPrice))}</dd>
                </div>
                {fee && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    O lucro já desconta a taxa de {CHANNEL_LABEL[fee.channel]}.
                  </p>
                )}
              </dl>
            ) : (
              !error && (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Informe peso e tempo de impressão maiores que zero para ver o preço.
                </p>
              )
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" onClick={handleApply} disabled={!result}>
            Usar este preço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
