"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHANNEL_LABEL } from "@/components/precificacao/canal-fee-form";
import { isPartBreakdownEntry } from "@/lib/services/pricing-formula";
import { tierLabel } from "@/lib/pricing/tier-label";
import type {
  EffectiveMargin,
  PriceCalculation,
  PriceCalculationResult,
  SizeTier,
  SizeTierDefinition,
} from "@/types/pricing";

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

// Mostra de onde veio a margem: no modo "substituir" a margem-alvo base não
// entra na conta, e a UI diz isso em vez de exibir uma soma que não houve.
// Cálculos salvos antes da margem por porte não têm essa informação (null) —
// eles não são recalculados nem migrados.
function MargemEfetiva({ margin, baseLabel }: { margin: EffectiveMargin; baseLabel: string }) {
  const origem =
    margin.mode === "substituir"
      ? `${formatPercent(margin.tierMarginPct)} do porte substitui a ${baseLabel} de ${formatPercent(margin.basePct)}`
      : `${formatPercent(margin.basePct)} de ${baseLabel} + ${formatPercent(margin.tierMarginPct)} do porte`;

  return (
    <span className="whitespace-nowrap">
      <strong className="font-semibold">{formatPercent(margin.effectivePct)}</strong>{" "}
      <span className="text-xs text-muted-foreground">({origem})</span>
    </span>
  );
}

interface ResultadoCalculoProps {
  result: PriceCalculationResult | PriceCalculation;
  saved: boolean;
  isResolvingTier?: boolean;
  onChooseTier?: (tier: SizeTier) => void;
  // Portes cadastrados, para resolver o rótulo do porte sugerido pelo nome de
  // exibição em vez de um Record fixo P/M/G.
  tiers: SizeTierDefinition[];
  // Nomes das peças componentes, para exibir o breakdown por componente de
  // uma peça composta (ver Requirement "Breakdown de custo por componente
  // para peça composta"). Sem isso, cai no id do componente.
  componentNames?: Record<string, string>;
}

export function ResultadoCalculo({
  result,
  saved,
  isResolvingTier,
  onChooseTier,
  tiers,
  componentNames,
}: ResultadoCalculoProps) {
  const { costBreakdown, totalCost, suggestedTier, channelPrices, b2bPrices, componentBreakdown, effectiveB2cMargin } =
    result;

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Custo da peça</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Filamento</dt>
            <dd>{formatCurrency(costBreakdown.filamentCost)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Energia</dt>
            <dd>{formatCurrency(costBreakdown.energyCost)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Depreciação</dt>
            <dd>{formatCurrency(costBreakdown.depreciationCost)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Reserva p/ falha</dt>
            <dd>{formatCurrency(costBreakdown.failureReserveCost)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Embalagem</dt>
            <dd>{formatCurrency(costBreakdown.packagingCost)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
            <dt>Total</dt>
            <dd>{formatCurrency(totalCost)}</dd>
          </div>
        </dl>
      </div>

      {suggestedTier && (
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Porte sugerido</h3>
          {suggestedTier.ambiguous ? (
            <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm text-foreground">
                Peso e tempo indicam portes diferentes ({suggestedTier.candidates.map((tier) => tierLabel(tier, tiers)).join(" ou ")}).
                Escolha manualmente o porte para salvar o cálculo.
              </p>
              <div className="flex gap-2">
                {suggestedTier.candidates.map((tier) => (
                  <Button
                    key={tier}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isResolvingTier || !onChooseTier}
                    onClick={() => onChooseTier?.(tier)}
                  >
                    Usar {tierLabel(tier, tiers)}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Badge variant="secondary">{tierLabel(suggestedTier.tier, tiers)}</Badge>
          )}
        </div>
      )}

      {componentBreakdown && (
        <div className="rounded-md border">
          <div className="p-4 pb-0">
            <h3 className="text-sm font-semibold text-foreground">Custo por parte / componente</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo unitário</TableHead>
                <TableHead>Custo total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentBreakdown.map((entry) => {
                // Parte inline: exibe o nome próprio e de onde veio o preço do
                // filamento (insumo do estoque vs. preço global). Componente do
                // catálogo (kind ausente/"component"): resolve o nome pela peça.
                const isPart = isPartBreakdownEntry(entry);
                const key = isPart ? `part-${entry.partId}` : `component-${entry.componentProductId}`;
                const label = isPart
                  ? entry.name
                  : componentNames?.[entry.componentProductId] ?? entry.componentProductId;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">
                      {label}
                      {isPart && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {entry.filamentSource === "material"
                            ? "filamento do estoque"
                            : "filamento (preço global)"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell>{formatCurrency(entry.unitCost)}</TableCell>
                    <TableCell>{formatCurrency(entry.totalCost)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-md border">
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="text-sm font-semibold text-foreground">Preço sugerido por canal (B2C)</h3>
          {!suggestedTier?.ambiguous && (
            <span className="text-xs text-muted-foreground">
              {saved ? "Salvo no histórico" : "Calculando..."}
            </span>
          )}
        </div>
        {effectiveB2cMargin && (
          <p className="px-4 pt-2 text-sm">
            <span className="text-muted-foreground">Margem aplicada: </span>
            <MargemEfetiva margin={effectiveB2cMargin} baseLabel="margem-alvo B2C" />
          </p>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Preço sugerido</TableHead>
              <TableHead>Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channelPrices.length ? (
              channelPrices.map((price) => (
                <TableRow key={price.channel}>
                  <TableCell className="font-medium">{CHANNEL_LABEL[price.channel]}</TableCell>
                  <TableCell>{formatCurrency(price.suggestedPrice)}</TableCell>
                  <TableCell>{formatCurrency(price.margin)}</TableCell>
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
              <TableHead>Preço sugerido</TableHead>
              <TableHead>Margem</TableHead>
              <TableHead>Margem aplicada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {b2bPrices.length ? (
              b2bPrices.map((price) => (
                <TableRow key={price.minQuantity}>
                  <TableCell className="font-medium">{price.minQuantity}+ un.</TableCell>
                  <TableCell>{formatCurrency(price.suggestedPrice)}</TableCell>
                  <TableCell>{formatCurrency(price.margin)}</TableCell>
                  <TableCell>
                    {price.effectiveMargin ? (
                      <MargemEfetiva margin={price.effectiveMargin} baseLabel="margem-alvo da faixa" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  Nenhuma faixa B2B vigente cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
