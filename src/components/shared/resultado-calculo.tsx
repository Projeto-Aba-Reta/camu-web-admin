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
import type { PriceCalculation, PriceCalculationResult, SizeTier } from "@/types/pricing";

const TIER_LABEL: Record<SizeTier, string> = { P: "Pequena (P)", M: "Média (M)", G: "Grande (G)" };

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

interface ResultadoCalculoProps {
  result: PriceCalculationResult | PriceCalculation;
  saved: boolean;
  isResolvingTier?: boolean;
  onChooseTier?: (tier: SizeTier) => void;
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
  componentNames,
}: ResultadoCalculoProps) {
  const { costBreakdown, totalCost, suggestedTier, channelPrices, b2bPrices, componentBreakdown } = result;

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Custo da peça</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-2 sm:contents">
            <dt className="text-muted-foreground">Filamento</dt>
            <dd>{formatCurrency(costBreakdown.filamentCost)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:contents">
            <dt className="text-muted-foreground">Energia</dt>
            <dd>{formatCurrency(costBreakdown.energyCost)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:contents">
            <dt className="text-muted-foreground">Depreciação</dt>
            <dd>{formatCurrency(costBreakdown.depreciationCost)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:contents">
            <dt className="text-muted-foreground">Reserva p/ falha</dt>
            <dd>{formatCurrency(costBreakdown.failureReserveCost)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:contents">
            <dt className="text-muted-foreground">Embalagem</dt>
            <dd>{formatCurrency(costBreakdown.packagingCost)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t pt-1 font-semibold sm:contents">
            <dt className="border-t pt-1 sm:border-0 sm:pt-0">Total</dt>
            <dd className="border-t pt-1 sm:border-0 sm:pt-0">{formatCurrency(totalCost)}</dd>
          </div>
        </dl>
      </div>

      {suggestedTier && (
        <div className="rounded-md border p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Porte sugerido</h3>
          {suggestedTier.ambiguous ? (
            <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-sm text-foreground">
                Peso e tempo indicam portes diferentes ({suggestedTier.candidates.map((tier) => TIER_LABEL[tier]).join(" ou ")}).
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
                    Usar {TIER_LABEL[tier]}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <Badge variant="secondary">{TIER_LABEL[suggestedTier.tier]}</Badge>
          )}
        </div>
      )}

      {componentBreakdown && (
        <div className="rounded-md border">
          <div className="p-4 pb-0">
            <h3 className="text-sm font-semibold text-foreground">Custo por componente</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo unitário</TableHead>
                <TableHead>Custo total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentBreakdown.map((component) => (
                <TableRow key={component.componentProductId}>
                  <TableCell className="font-medium">
                    {componentNames?.[component.componentProductId] ?? component.componentProductId}
                  </TableCell>
                  <TableCell>{component.quantity}</TableCell>
                  <TableCell>{formatCurrency(component.unitCost)}</TableCell>
                  <TableCell>{formatCurrency(component.totalCost)}</TableCell>
                </TableRow>
              ))}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {b2bPrices.length ? (
              b2bPrices.map((price) => (
                <TableRow key={price.minQuantity}>
                  <TableCell className="font-medium">{price.minQuantity}+ un.</TableCell>
                  <TableCell>{formatCurrency(price.suggestedPrice)}</TableCell>
                  <TableCell>{formatCurrency(price.margin)}</TableCell>
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
    </div>
  );
}
