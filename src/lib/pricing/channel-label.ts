import type { MarketplaceChannel, SalesChannel } from "@/types/pricing";

// Marketplaces: os canais que têm taxa cadastrada e preço sugerido emitido
// pelo motor de cálculo.
export const CHANNEL_LABEL: Record<MarketplaceChannel, string> = {
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  amazon: "Amazon",
  shein: "SHEIN",
};

// Todos os canais de venda da peça, incluindo a loja do site. Separado de
// CHANNEL_LABEL de propósito: a tela de taxas de canal e o resultado do
// cálculo continuam falando só de marketplace.
export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  ...CHANNEL_LABEL,
  loja_propria: "Loja própria (site)",
};
