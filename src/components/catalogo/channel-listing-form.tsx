"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHANNEL_LABEL, SALES_CHANNEL_LABEL } from "@/lib/pricing/channel-label";
import { MARKETPLACE_CHANNELS } from "@/lib/validation/pricing-schemas";
import { useProductSaveSection } from "@/components/catalogo/product-save-bar";
import { upsertChannelListingAction } from "@/app/(dashboard)/producao/catalogo/actions";
import type { StorePublishReadiness } from "@/lib/services/catalog-service";
import type { ProductChannelListing } from "@/types/catalog";
import { LOJA_PROPRIA_CHANNEL, type MarketplaceChannel, type PriceCalculation } from "@/types/pricing";

interface ChannelListingFormProps {
  productId: string;
  channelListings: ProductChannelListing[];
  linkedCalculation: PriceCalculation | null;
  // O que falta para a peça poder ir ao ar no site, calculado no servidor ao
  // abrir a tela (ver Requirement "Peça pronta para publicação na loja
  // própria").
  storeReadiness: StorePublishReadiness;
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

// Compara o que está no campo com o que o servidor devolveu. Numérica de
// propósito: "12.5" digitado e "12.50" vindo do banco são o mesmo preço, e
// comparar como texto deixaria o campo eternamente marcado como não salvo.
function samePrice(typed: string, saved: string): boolean {
  const left = typed.trim();
  const right = saved.trim();
  if (left === right) return true;
  if (left === "" || right === "") return false;
  const leftValue = Number(left);
  const rightValue = Number(right);
  if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) return false;
  return !pricesDiverge(leftValue, rightValue);
}

function suggestedPriceFor(calculation: PriceCalculation | null, channel: MarketplaceChannel): number | null {
  if (!calculation) return null;
  return calculation.channelPrices.find((cp) => cp.channel === channel)?.suggestedPrice ?? null;
}

export function ChannelListingForm({
  productId,
  channelListings,
  linkedCalculation,
  storeReadiness,
  canWrite,
}: ChannelListingFormProps) {
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

  // Linha alterada e ainda não gravada. `initialState` acompanha o servidor
  // (muda quando as listagens são recarregadas), então uma linha volta a ficar
  // limpa assim que a gravação é refletida na tela.
  function isRowDirty(channel: MarketplaceChannel): boolean {
    const row = rows[channel];
    const initial = initialState[channel];
    return (
      !samePrice(row.listedPrice, initial.listedPrice) ||
      row.isActive !== initial.isActive ||
      row.priceOverrideReason.trim() !== initial.priceOverrideReason.trim()
    );
  }

  const dirtyChannels = MARKETPLACE_CHANNELS.filter(isRowDirty);

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

  useProductSaveSection("channels", "Canais de venda", canWrite && dirtyChannels.length > 0, async () => {
    for (const channel of dirtyChannels) {
      await handleSave(channel);
    }
  });

  return (
    <div className="space-y-6">
      <StoreListingSection
        productId={productId}
        listing={channelListings.find((listing) => listing.channel === LOJA_PROPRIA_CHANNEL) ?? null}
        readiness={storeReadiness}
        canWrite={canWrite}
      />

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
                {canWrite && <TableHead className="w-24" />}
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
                    {/* Sem botão por linha: quem grava é a barra do rodapé,
                        junto com o resto da tela. A marca só sinaliza o que
                        ainda está pendente. */}
                    {canWrite && (
                      <TableCell className="text-right">
                        {row.isSaving ? (
                          <span className="text-xs text-muted-foreground">Salvando...</span>
                        ) : (
                          isRowDirty(channel) && <Badge variant="outline">Não salvo</Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

interface StoreListingSectionProps {
  productId: string;
  listing: ProductChannelListing | null;
  // Recalculada no servidor a cada render da página: capa, status e slug
  // mudam em outros blocos da tela, e cada um deles chama router.refresh(),
  // o que traz esta prop atualizada. Por isso ela não é copiada para estado
  // local — a cópia congelaria o "falta para publicar" no que era verdade
  // quando a tela abriu.
  readiness: StorePublishReadiness;
  canWrite: boolean;
}

// A loja própria ganha seção própria, e não uma linha na tabela de canais:
// publicar tem pré-requisitos (capa, preço, slug, status) que precisam ser
// mostrados, e não tem preço sugerido nem motivo de divergência.
function StoreListingSection({ productId, listing, readiness, canWrite }: StoreListingSectionProps) {
  const router = useRouter();
  const savedPrice = listing ? listing.listedPrice.toFixed(2) : "";
  const [price, setPrice] = useState(savedPrice);
  const [isSaving, setIsSaving] = useState(false);
  const isPublished = listing?.isActive ?? false;

  // O preço do site é o único pré-requisito que o usuário resolve aqui mesmo:
  // com ele preenchido no campo, o que falta é só o resto.
  const missingBesidesPrice = readiness.missing.filter((item) => item !== "preço do site");
  const priceValue = Number(price);
  const hasValidPrice = Boolean(price) && !Number.isNaN(priceValue) && priceValue > 0;
  const canPublish = missingBesidesPrice.length === 0 && hasValidPrice;

  useProductSaveSection("store", "Preço do site", canWrite && !samePrice(price, savedPrice), () =>
    save(isPublished),
  );

  async function save(nextIsActive: boolean) {
    if (!hasValidPrice) {
      toast.error("Informe o preço do site antes de salvar.");
      return;
    }

    setIsSaving(true);
    const result = await upsertChannelListingAction(productId, {
      channel: LOJA_PROPRIA_CHANNEL,
      listedPrice: priceValue,
      isActive: nextIsActive,
      priceOverrideReason: null,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a publicação na loja própria.");
      return;
    }
    if (nextIsActive !== isPublished) {
      toast.success(nextIsActive ? "Peça publicada na loja do site." : "Peça despublicada da loja do site.");
    } else {
      toast.success("Preço do site salvo.");
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Vender na loja própria (site)</h3>
        {isPublished ? (
          <Badge variant="secondary">Publicada no site</Badge>
        ) : (
          <Badge variant="outline">Fora do site</Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Publicar aqui coloca a peça na loja de {SALES_CHANNEL_LABEL[LOJA_PROPRIA_CHANNEL].toLowerCase()} pelo preço
        abaixo. Diferente dos marketplaces, este canal não tem preço sugerido — o preço é livre.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="store-price">
            Preço do site (R$)
          </label>
          <Input
            id="store-price"
            type="number"
            step="0.01"
            className="w-32"
            disabled={!canWrite}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={isPublished}
            disabled={!canWrite || isSaving || (!isPublished && !canPublish)}
            onCheckedChange={(checked) => void save(checked)}
          />
          <span className="text-sm">{isPublished ? "Publicada" : "Publicar no site"}</span>
        </div>
      </div>

      {!isPublished && missingBesidesPrice.length > 0 && (
        <p className="text-xs text-destructive">
          Falta para publicar: {missingBesidesPrice.join(", ")}
          {!hasValidPrice && ", preço do site"}.
        </p>
      )}
      {!isPublished && missingBesidesPrice.length === 0 && !hasValidPrice && (
        <p className="text-xs text-destructive">Falta para publicar: preço do site.</p>
      )}
    </div>
  );
}
