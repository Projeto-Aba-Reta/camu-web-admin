"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canConfigureSales } from "@/lib/auth/sales-access";
import { createAdminClient } from "@/lib/supabase/admin";

// A miniatura de pet fica FORA da vitrine V2 (docs/catalogo-v2-plano.md §2.1):
// o preço continua no listing `loja_propria` de dois produtos de `products`,
// cujos ids vêm das mesmas env vars usadas pela landing.
const SITE_CHANNEL = "loja_propria";

export type MiniaturaVariant = "sem_pintura" | "com_pintura";

function productIdFor(variant: MiniaturaVariant): string | undefined {
  return variant === "sem_pintura"
    ? process.env.PET_MINIATURE_PRODUCT_ID_SEM_PINTURA
    : process.env.PET_MINIATURE_PRODUCT_ID_COM_PINTURA;
}

export interface MiniaturaPrices {
  configured: boolean;
  semPinturaCents: number | null;
  comPinturaCents: number | null;
}

export async function loadMiniaturaPrices(): Promise<MiniaturaPrices> {
  const ids = (["sem_pintura", "com_pintura"] as const).map(productIdFor);
  if (ids.some((id) => !id)) return { configured: false, semPinturaCents: null, comPinturaCents: null };

  const db = createAdminClient();
  const { data } = await db
    .from("product_channel_listings")
    .select("product_id, listed_price")
    .eq("channel", SITE_CHANNEL)
    .in("product_id", ids as string[]);
  const byId = new Map((data ?? []).map((l) => [l.product_id as string, Math.round(Number(l.listed_price) * 100)]));
  return {
    configured: true,
    semPinturaCents: byId.get(ids[0]!) ?? null,
    comPinturaCents: byId.get(ids[1]!) ?? null,
  };
}

export async function updateMiniaturaPriceAction(
  variant: MiniaturaVariant,
  priceCents: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getCurrentProfile();
    if (!user || !canConfigureSales(user)) return { ok: false, error: "Sem permissão para alterar preços." };
    if (!Number.isInteger(priceCents) || priceCents <= 0) return { ok: false, error: "Informe um preço maior que zero." };

    const productId = productIdFor(variant);
    if (!productId) return { ok: false, error: "Variável PET_MINIATURE_PRODUCT_ID_* não configurada no admin." };

    const db = createAdminClient();
    const { data: existing, error: readError } = await db
      .from("product_channel_listings")
      .select("id")
      .eq("product_id", productId)
      .eq("channel", SITE_CHANNEL)
      .maybeSingle();
    if (readError) throw readError;

    const row = {
      listed_price: priceCents / 100,
      is_active: true,
      // O trigger exige motivo quando diverge do cálculo vinculado à peça.
      price_override_reason: "Ajuste manual em Vendas > Configurações",
    };
    const { error } = existing
      ? await db.from("product_channel_listings").update(row).eq("id", existing.id)
      : await db.from("product_channel_listings").insert({ product_id: productId, channel: SITE_CHANNEL, ...row });
    if (error) throw error;

    revalidatePath("/vendas/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível salvar o preço." };
  }
}
