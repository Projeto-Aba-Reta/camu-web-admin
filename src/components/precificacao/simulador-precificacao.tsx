"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHANNEL_LABEL } from "@/lib/pricing/channel-label";
import {
  mergeB2bTiers,
  mergeChannelFees,
  mergeCostParameters,
  mergeSizeTierRanges,
  usePricingDraft,
} from "@/components/precificacao/pricing-draft-context";
import {
  buildFormulaSteps,
  calculateB2bPrice,
  calculateChannelPrice,
  calculateCostBreakdown,
  classifyTier,
  findTierRange,
  resolveB2bMargin,
  resolveB2cMargin,
  sumCostBreakdown,
  type FormulaStep,
  type FormulaTerm,
} from "@/lib/services/pricing-formula";
import type {
  B2bPricingTier,
  ChannelFee,
  CostParameters,
  Printer,
  SizeTier,
  SizeTierDefinition,
  SizeTierRange,
} from "@/types/pricing";
import { tierLabel } from "@/lib/pricing/tier-label";

// Simulador: roda a MESMA fórmula do motor (pricing-formula.ts) sobre duas
// cópias dos parâmetros — os vigentes e os vigentes com o rascunho dos
// formulários sobreposto — e mostra os dois preços lado a lado. Não persiste
// nada: nenhum parâmetro, nenhum cálculo no histórico.

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatTerm(term: FormulaTerm): string {
  return term.kind === "currency" ? formatCurrency(term.value) : formatPercent(term.value);
}

// A UI só substitui os operandos no template — a conta veio pronta do motor.
function renderExpression(step: FormulaStep): string {
  return step.template.replace(/\{(\d+)\}/g, (_, index: string) => formatTerm(step.terms[Number(index)]));
}

interface Cenario {
  totalCost: number;
  steps: FormulaStep[];
  tier: SizeTier;
  channelPrices: Array<{ channel: ChannelFee["channel"]; suggestedPrice: number }>;
  b2bPrices: Array<{ minQuantity: number; suggestedPrice: number }>;
}

interface SimuladorProps {
  costParameters: CostParameters | null;
  printers: Printer[];
  channelFees: ChannelFee[];
  sizeTierRanges: SizeTierRange[];
  sizeTiers: SizeTierDefinition[];
  b2bTiers: B2bPricingTier[];
  // Peças do catálogo com ficha de fatiamento, para simular uma peça real em
  // vez de digitar peso/tempo.
  produtosComFicha: Array<{ id: string; name: string; weightGrams: number; printHours: number; printerId: string }>;
}

export function SimuladorPrecificacao({
  costParameters,
  printers,
  channelFees,
  sizeTierRanges,
  sizeTiers,
  b2bTiers,
  produtosComFicha,
}: SimuladorProps) {
  const draft = usePricingDraft();

  const [weightGrams, setWeightGrams] = useState(40);
  const [printHours, setPrintHours] = useState(3.2);
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? "");
  const [chosenTier, setChosenTier] = useState<SizeTier | null>(null);
  const [produtoId, setProdutoId] = useState<string>("");

  // Parâmetros com o rascunho sobreposto: o que passaria a valer se os
  // formulários fossem salvos agora.
  const rascunho = useMemo(
    () => ({
      costParameters: mergeCostParameters(costParameters, draft.costParameters),
      channelFees: mergeChannelFees(channelFees, draft.channelFee),
      sizeTierRanges: mergeSizeTierRanges(sizeTierRanges, draft.sizeTier),
      b2bTiers: mergeB2bTiers(b2bTiers, draft.b2bTier),
    }),
    [costParameters, channelFees, sizeTierRanges, b2bTiers, draft],
  );

  const printer = printers.find((p) => p.id === printerId) ?? null;

  // Classificação com as faixas em edição — mexer nos limites de peso/tempo
  // pode mudar o porte da peça de exemplo, e o simulador tem que mostrar isso.
  const classificacao = useMemo(() => {
    if (!rascunho.sizeTierRanges.length) return null;
    try {
      return classifyTier(weightGrams, printHours, rascunho.sizeTierRanges, sizeTiers);
    } catch {
      return null;
    }
  }, [weightGrams, printHours, rascunho.sizeTierRanges, sizeTiers]);

  const tierCandidatos = classificacao?.ambiguous ? classificacao.candidates : [];
  // Ambiguidade não bloqueia a simulação (nada é persistido): o simulador usa
  // o porte escolhido, ou o primeiro candidato como palpite.
  const tierEfetivo: SizeTier | null =
    chosenTier ?? (classificacao ? (classificacao.ambiguous ? classificacao.candidates[0] : classificacao.tier) : null);

  function simular(
    params: CostParameters | null,
    fees: ChannelFee[],
    ranges: SizeTierRange[],
    volumeTiers: B2bPricingTier[],
  ): Cenario | null {
    if (!params || !printer || !tierEfetivo) return null;

    const costBreakdown = calculateCostBreakdown(weightGrams, printHours, printer.depreciationPerHour, params);
    const totalCost = sumCostBreakdown(costBreakdown);

    const range = findTierRange(ranges, tierEfetivo);
    const effectiveB2cMargin = resolveB2cMargin(params.targetMarginPct, range);

    const channels = fees.map((fee) => ({
      channel: fee.channel,
      percentageFee: fee.percentageFee,
      fixedFee: fee.fixedFee,
      ...calculateChannelPrice(totalCost, effectiveB2cMargin, fee.percentageFee, fee.fixedFee),
    }));

    const b2bPrices = volumeTiers.map((volumeTier) =>
      calculateB2bPrice(totalCost, volumeTier.minQuantity, resolveB2bMargin(volumeTier.targetMarginPct, range)),
    );

    return {
      totalCost,
      tier: tierEfetivo,
      channelPrices: channels,
      b2bPrices,
      steps: buildFormulaSteps({ costBreakdown, totalCost, effectiveB2cMargin, channels, b2bPrices }),
    };
  }

  let vigente: Cenario | null = null;
  let projetado: Cenario | null = null;
  let erro: string | null = null;
  try {
    vigente = simular(costParameters, channelFees, sizeTierRanges, b2bTiers);
    projetado = simular(
      rascunho.costParameters,
      rascunho.channelFees,
      rascunho.sizeTierRanges,
      rascunho.b2bTiers,
    );
  } catch (error) {
    erro = error instanceof Error ? error.message : "Não foi possível simular com estes valores.";
  }

  function aplicarProduto(id: string) {
    setProdutoId(id);
    const produto = produtosComFicha.find((p) => p.id === id);
    if (!produto) return;
    setWeightGrams(produto.weightGrams);
    setPrintHours(produto.printHours);
    setPrinterId(produto.printerId);
    setChosenTier(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-semibold text-foreground">Peça de exemplo</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Nada aqui é salvo. A simulação usa os parâmetros vigentes e, por cima deles, o que estiver preenchido nos
          formulários acima — para você ver o efeito antes de atualizar os valores.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {produtosComFicha.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label>Peça do catálogo (opcional)</Label>
              <Select value={produtoId} onValueChange={aplicarProduto}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Digitar peso e tempo manualmente" />
                </SelectTrigger>
                <SelectContent>
                  {produtosComFicha.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.name} ({produto.weightGrams}g · {produto.printHours}h)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="sim-peso">Peso (g)</Label>
            <Input
              id="sim-peso"
              type="number"
              step="1"
              value={weightGrams}
              onChange={(event) => setWeightGrams(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-tempo">Tempo (h)</Label>
            <Input
              id="sim-tempo"
              type="number"
              step="0.1"
              value={printHours}
              onChange={(event) => setPrintHours(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Impressora</Label>
            <Select value={printerId} onValueChange={setPrinterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma impressora" />
              </SelectTrigger>
              <SelectContent>
                {printers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Porte classificado:</span>
          {tierEfetivo ? <Badge variant="secondary">{tierLabel(tierEfetivo, sizeTiers)}</Badge> : <Badge variant="outline">—</Badge>}
          {tierCandidatos.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">
                Peso e tempo indicam portes diferentes — escolha qual usar:
              </span>
              {tierCandidatos.map((tier) => (
                <Button
                  key={tier}
                  type="button"
                  size="sm"
                  variant={tierEfetivo === tier ? "default" : "outline"}
                  onClick={() => setChosenTier(tier)}
                >
                  {tierLabel(tier, sizeTiers)}
                </Button>
              ))}
            </>
          )}
        </div>
      </div>

      {erro && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">{erro}</p>
      )}

      {!erro && !projetado && (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Cadastre parâmetros de custo, uma impressora e as faixas de porte para simular.
        </p>
      )}

      {projetado && (
        <>
          <div className="rounded-md border p-4">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Como este preço é calculado</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Fórmula do motor de cálculo com as taxas atuais e o que está em edição nos formulários acima.
            </p>
            <dl className="space-y-2 text-sm">
              {projetado.steps.map((step) => (
                <div key={step.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                  <dt className="min-w-48 text-muted-foreground">{stepTitle(step)}</dt>
                  <dd className="font-mono text-xs sm:text-sm">
                    {renderExpression(step)} <span className="text-muted-foreground">=</span>{" "}
                    <strong className="font-semibold">{formatTerm(step.result)}</strong>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-md border">
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-foreground">Preço por canal (B2C)</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Se salvar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projetado.channelPrices.length ? (
                  projetado.channelPrices.map((price) => (
                    <TableRow key={price.channel}>
                      <TableCell className="font-medium">{CHANNEL_LABEL[price.channel]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(
                          vigente?.channelPrices.find((p) => p.channel === price.channel)?.suggestedPrice ?? 0,
                        )}
                      </TableCell>
                      <TableCell>
                        <Delta
                          atual={vigente?.channelPrices.find((p) => p.channel === price.channel)?.suggestedPrice}
                          projetado={price.suggestedPrice}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      Nenhuma taxa de canal vigente cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-md border">
            <div className="p-4 pb-0">
              <h3 className="text-sm font-semibold text-foreground">Preço por faixa de volume (B2B)</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quantidade mínima</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Se salvar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projetado.b2bPrices.length ? (
                  projetado.b2bPrices.map((price) => (
                    <TableRow key={price.minQuantity}>
                      <TableCell className="font-medium">{price.minQuantity}+ un.</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(
                          vigente?.b2bPrices.find((p) => p.minQuantity === price.minQuantity)?.suggestedPrice ?? 0,
                        )}
                      </TableCell>
                      <TableCell>
                        <Delta
                          atual={vigente?.b2bPrices.find((p) => p.minQuantity === price.minQuantity)?.suggestedPrice}
                          projetado={price.suggestedPrice}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                      Nenhuma faixa B2B vigente cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function stepTitle(step: FormulaStep): string {
  return step.id.startsWith("canal-") ? CHANNEL_LABEL[step.title as keyof typeof CHANNEL_LABEL] : step.title;
}

function Delta({ atual, projetado }: { atual: number | undefined; projetado: number }) {
  const mudou = atual !== undefined && Math.abs(atual - projetado) > 0.005;
  return (
    <span className={mudou ? "font-semibold text-foreground" : "text-muted-foreground"}>
      {formatCurrency(projetado)}
      {mudou && atual !== undefined && (
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          ({projetado > atual ? "+" : "−"}
          {formatCurrency(Math.abs(projetado - atual))})
        </span>
      )}
    </span>
  );
}
