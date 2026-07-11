"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHANNEL_LABEL } from "@/components/precificacao/canal-fee-form";
import { MARKETPLACE_CHANNELS } from "@/lib/validation/pricing-schemas";
import { upsertChannelListingAction } from "@/app/(dashboard)/producao/catalogo/actions";
import type { ProductChannelListing } from "@/types/catalog";
import type { MarketplaceChannel, PriceCalculation } from "@/types/pricing";

interface ChannelListingFormProps {
  productId: string;
  channelListings: ProductChannelListing[];
  linkedCalculation: PriceCalculation | null;
  canWrite: boolean;
}

interface ChannelRowState {
  listedPrice: string;
  isActive: boolean;
  priceOverrideReason: string;
  isSaving: boolean;
}

function pricesDiverge(listedPrice: number, suggestedPrice: number): boolean {
  return Math.round(listedPrice * 100) !== Math.round(suggestedPrice * 100);
}

function suggestedPriceFor(calculation: PriceCalculation | null, channel: MarketplaceChannel): number | null {
  if (!calculation) return null;
  return calculation.channelPrices.find((cp) => cp.channel === channel)?.suggestedPrice ?? null;
}

export function ChannelListingForm({ productId, channelListings, linkedCalculation, canWrite }: ChannelListingFormProps) {
  const router = useRouter();

  const initialState = useMemo(() => {
    const state: Record<MarketplaceChannel, ChannelRowState> = {} as Record<MarketplaceChannel, ChannelRowState>;
    for (const channel of MARKETPLACE_CHANNELS) {
      const existing = channelListings.find((listing) => listing.channel === channel);
      const suggested = suggestedPriceFor(linkedCalculation, channel);
      const initialPrice = existing?.listedPrice ?? suggested ?? null;
      state[channel] = {
        listedPrice: initialPrice !== null ? initialPrice.toFixed(2) : "",
        isActive: existing?.isActive ?? false,
        priceOverrideReason: existing?.priceOverrideReason ?? "",
        isSaving: false,
      };
    }
    return state;
  }, [channelListings, linkedCalculation]);

  const [rows, setRows] = useState(initialState);

  function updateRow(channel: MarketplaceChannel, patch: Partial<ChannelRowState>) {
    setRows((current) => ({ ...current, [channel]: { ...current[channel], ...patch } }));
  }

  function reasonRequired(channel: MarketplaceChannel): boolean {
    const row = rows[channel];
    const suggested = suggestedPriceFor(linkedCalculation, channel);
    const price = Number(row.listedPrice);
    if (suggested === null || !row.listedPrice || Number.isNaN(price)) return false;
    return pricesDiverge(price, suggested) && !row.priceOverrideReason.trim();
  }

  async function handleSave(channel: MarketplaceChannel) {
    const row = rows[channel];
    const price = Number(row.listedPrice);
    if (!row.listedPrice || Number.isNaN(price) || price <= 0) {
      toast.error("Informe um preço praticado válido.");
      return;
    }
    if (reasonRequired(channel)) {
      toast.error("Informe o motivo: o preço diverge do sugerido pelo cálculo vinculado.");
      return;
    }

    updateRow(channel, { isSaving: true });
    const result = await upsertChannelListingAction(productId, {
      channel,
      listedPrice: price,
      isActive: row.isActive,
      priceOverrideReason: row.priceOverrideReason.trim() || null,
    });
    updateRow(channel, { isSaving: false });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a disponibilidade do canal.");
      return;
    }
    toast.success(`Disponibilidade em ${CHANNEL_LABEL[channel]} atualizada.`);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">Disponibilidade por canal</h3>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Preço praticado</TableHead>
              <TableHead>Motivo (se divergir do sugerido)</TableHead>
              {canWrite && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MARKETPLACE_CHANNELS.map((channel) => {
              const row = rows[channel];
              const suggested = suggestedPriceFor(linkedCalculation, channel);
              const needsReason = reasonRequired(channel);
              return (
                <TableRow key={channel}>
                  <TableCell className="font-medium">
                    {CHANNEL_LABEL[channel]}
                    {suggested !== null && (
                      <div className="text-xs font-normal text-muted-foreground">
                        Sugerido: R$ {suggested.toFixed(2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.isActive}
                      disabled={!canWrite}
                      onCheckedChange={(checked) => updateRow(channel, { isActive: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32"
                      disabled={!canWrite}
                      value={row.listedPrice}
                      onChange={(event) => updateRow(channel, { listedPrice: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      rows={1}
                      className="min-w-48"
                      disabled={!canWrite}
                      placeholder={needsReason ? "Obrigatório: preço diverge do sugerido" : "Opcional"}
                      value={row.priceOverrideReason}
                      onChange={(event) => updateRow(channel, { priceOverrideReason: event.target.value })}
                    />
                    {needsReason && <p className="mt-1 text-xs text-destructive">Motivo obrigatório para salvar.</p>}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button type="button" size="sm" disabled={row.isSaving} onClick={() => handleSave(channel)}>
                        Salvar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
