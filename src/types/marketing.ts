export type CommemorativeDateRuleType = "fixa" | "movel";

export interface CommemorativeDate {
  id: string;
  name: string;
  ruleType: CommemorativeDateRuleType;
  // fixa: "MM-DD" (repete todo ano). movel: "YYYY-MM-DD" (ocorrência
  // concreta do ciclo atual — ver migration calendario_marketing_redes_sociais).
  ruleValue: string;
  category: string;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
}

// Redes sociais, deliberadamente distintas de MarketplaceChannel (canais de
// venda): quem publica um Reels não publica na Shopee.
export type SocialChannel = "instagram" | "tiktok" | "youtube" | "kwai" | "facebook" | "outro";

export type SocialContentStatus = "ideia" | "roteiro" | "gravacao" | "edicao" | "agendado" | "publicado";

// Funil linear: um item só avança para o status seguinte nesta ordem (ver
// Requirement "Progressão de status do funil de conteúdo"). Também define a
// ordem das colunas do board.
export const SOCIAL_CONTENT_STATUS_SEQUENCE: readonly SocialContentStatus[] = [
  "ideia",
  "roteiro",
  "gravacao",
  "edicao",
  "agendado",
  "publicado",
] as const;

export const SOCIAL_CHANNELS: readonly SocialChannel[] = [
  "instagram",
  "tiktok",
  "youtube",
  "kwai",
  "facebook",
  "outro",
] as const;

export interface SocialContentPlanItem {
  id: string;
  commemorativeDateId: string | null;
  title: string;
  // A mesma gravação costuma ir para mais de uma rede — um item cobre todos
  // os canais em que aquele conteúdo será publicado, e sempre tem pelo menos
  // um (garantido pelo SocialContentPlanService).
  channels: SocialChannel[];
  status: SocialContentStatus;
  responsibleId: string | null;
  targetDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

// Uma linha por transição de status — o item guarda só o status atual.
export interface SocialContentStatusEvent {
  id: string;
  itemId: string;
  fromStatus: SocialContentStatus;
  toStatus: SocialContentStatus;
  changedBy: string | null;
  changedAt: string;
}
