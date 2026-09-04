import type { PetMiniatureRequest } from "@/types/pet-miniature";

// Timeline única do pedido de miniatura, juntando as duas tabelas que o
// alimentam: antes de existir pedido, quem manda é pet_miniature_requests
// (geração da prévia por IA); depois que o cliente aprova e paga, quem manda
// é orders.status (o mesmo eixo logístico da loja do site, ver comentário da
// coluna orders.status na migration 20260724120000). Nada aqui grava dado —
// é só a leitura combinada que a tela de produção precisa pra montar as
// colunas do quadro.
export const PET_MINIATURE_TIMELINE_STAGES = [
  { slug: "gerando_previa", label: "Gerando prévia (IA)" },
  { slug: "falhou_geracao", label: "Falha na geração" },
  { slug: "aguardando_pagamento", label: "Aguardando aprovação/pagamento" },
  { slug: "pago", label: "Pago" },
  { slug: "em_producao", label: "Em produção" },
  { slug: "acabamento", label: "Acabamento" },
  { slug: "enviado", label: "Enviado" },
  { slug: "entregue", label: "Entregue" },
  { slug: "cancelado", label: "Cancelado" },
] as const;

export type PetMiniatureTimelineStage = (typeof PET_MINIATURE_TIMELINE_STAGES)[number]["slug"];

export function timelineStageLabel(slug: PetMiniatureTimelineStage): string {
  return PET_MINIATURE_TIMELINE_STAGES.find((stage) => stage.slug === slug)?.label ?? slug;
}

// orderStatus vem de orders.status (texto livre no banco, ver
// CUSTOMER_ORDER_STATUSES em types/vendas.ts) — status fora do vocabulário
// cai em "aguardando_pagamento" pra nunca sumir do quadro.
export function resolvePetMiniatureTimelineStage(
  request: Pick<PetMiniatureRequest, "status" | "orderId">,
  orderStatus: string | null,
): PetMiniatureTimelineStage {
  if (!request.orderId) {
    if (request.status === "falhou") return "falhou_geracao";
    if (request.status === "processando") return "gerando_previa";
    // "pronto" sem order_id = prévia aprovável, cliente ainda não pagou.
    return "aguardando_pagamento";
  }

  switch (orderStatus) {
    case "paid":
      return "pago";
    case "in_production":
      return "em_producao";
    case "finishing":
      return "acabamento";
    case "shipped":
      return "enviado";
    case "delivered":
      return "entregue";
    case "cancelled":
      return "cancelado";
    case "pending":
    default:
      return "aguardando_pagamento";
  }
}

const MEDIA_BUCKET = "pet-media";

// Mesmo formato de publicMediaUrl() do camu-web-landing-page
// (src/lib/pet-miniature.ts) — bucket público, sem precisar de signed URL.
export function petMiniaturePublicMediaUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${storagePath}`;
}
