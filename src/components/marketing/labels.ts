import type { SocialChannel, SocialContentStatus } from "@/types/marketing";

export const SOCIAL_CHANNEL_LABEL: Record<SocialChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  kwai: "Kwai",
  facebook: "Facebook",
  outro: "Outro",
};

export const SOCIAL_STATUS_LABEL: Record<SocialContentStatus, string> = {
  ideia: "Ideia",
  roteiro: "Roteiro",
  gravacao: "Gravação",
  edicao: "Edição",
  agendado: "Agendado",
  publicado: "Publicado",
};
