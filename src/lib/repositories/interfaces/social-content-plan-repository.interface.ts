import type {
  SocialChannel,
  SocialContentPlanItem,
  SocialContentStatus,
  SocialContentStatusEvent,
} from "@/types/marketing";

export interface CreateSocialContentPlanItemInput {
  commemorativeDateId: string | null;
  title: string;
  channels: SocialChannel[];
  responsibleId: string | null;
  targetDate: string | null;
  notes: string | null;
  createdBy: string | null;
}

export interface UpdateSocialContentPlanItemInput {
  commemorativeDateId?: string | null;
  title?: string;
  // Quando informado, substitui a lista inteira de canais do item.
  channels?: SocialChannel[];
  status?: SocialContentStatus;
  responsibleId?: string | null;
  targetDate?: string | null;
  notes?: string | null;
}

export interface RecordStatusEventInput {
  itemId: string;
  fromStatus: SocialContentStatus;
  toStatus: SocialContentStatus;
  changedBy: string | null;
}

export interface ISocialContentPlanRepository {
  findById(id: string): Promise<SocialContentPlanItem | null>;
  // Sem argumento retorna todos os itens (board agrupa por status na
  // memória); com argumento filtra pelos status informados.
  listByStatus(statuses?: SocialContentStatus[]): Promise<SocialContentPlanItem[]>;
  // Itens com data alvo dentro do intervalo (inclusivo), em ISO 'YYYY-MM-DD'
  // — alimenta a visão de calendário mensal.
  listByTargetDateRange(from: string, to: string): Promise<SocialContentPlanItem[]>;
  create(input: CreateSocialContentPlanItemInput): Promise<SocialContentPlanItem>;
  update(id: string, input: UpdateSocialContentPlanItemInput): Promise<SocialContentPlanItem>;
  // Histórico append-only de transições de status (ver Requirement
  // "Progressão de status do funil de conteúdo").
  recordStatusEvent(input: RecordStatusEventInput): Promise<SocialContentStatusEvent>;
  listStatusEvents(itemId: string): Promise<SocialContentStatusEvent[]>;
}
