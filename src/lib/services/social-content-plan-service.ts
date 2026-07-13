import type { Repositories } from "@/lib/repositories";
import {
  SOCIAL_CONTENT_STATUS_SEQUENCE,
  type CommemorativeDate,
  type CommemorativeDateRuleType,
  type SocialChannel,
  type SocialContentPlanItem,
  type SocialContentStatus,
  type SocialContentStatusEvent,
} from "@/types/marketing";

export interface CreateCommemorativeDateServiceInput {
  name: string;
  ruleType: CommemorativeDateRuleType;
  ruleValue: string;
  category: string;
  createdBy: string | null;
}

export interface CreatePlanItemInput {
  commemorativeDateId: string | null;
  title: string;
  channels: SocialChannel[];
  responsibleId: string | null;
  targetDate: string | null;
  notes: string | null;
  createdBy: string | null;
}

export interface UpdatePlanItemInput {
  commemorativeDateId: string | null;
  title: string;
  channels: SocialChannel[];
  responsibleId: string | null;
  targetDate: string | null;
  notes: string | null;
}

// Uma data comemorativa resolvida para o dia concreto em que cai dentro do
// mês consultado (ver migration: `fixa` guarda 'MM-DD' e repete todo ano,
// `movel` guarda a ocorrência 'YYYY-MM-DD' do ciclo atual).
export interface CommemorativeDateOccurrence {
  date: CommemorativeDate;
  // ISO 'YYYY-MM-DD' dentro do mês consultado.
  occursOn: string;
}

export interface MonthPlan {
  dates: CommemorativeDateOccurrence[];
  items: SocialContentPlanItem[];
}

type SocialContentPlanRepositories = Pick<Repositories, "commemorativeDates" | "socialContentPlanItems">;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

// A tabela de junção não consegue exigir "pelo menos um canal" (uma linha a
// menos é simplesmente ausência de linha), então a regra vive aqui.
function assertHasChannel(channels: SocialChannel[]): void {
  if (channels.length === 0) {
    throw new Error("Selecione pelo menos um canal para o post.");
  }
}

// Data comemorativa ativa cai no mês? `fixa` cai todo ano, então basta o mês
// bater; `movel` só cai se o ano também bater.
function resolveOccurrence(date: CommemorativeDate, year: number, month: number): string | null {
  if (date.ruleType === "fixa") {
    const [monthPart, dayPart] = date.ruleValue.split("-");
    return Number(monthPart) === month ? `${year}-${monthPart}-${dayPart}` : null;
  }

  const [yearPart, monthPart] = date.ruleValue.split("-");
  return Number(yearPart) === year && Number(monthPart) === month ? date.ruleValue : null;
}

export class SocialContentPlanService {
  constructor(private readonly repositories: SocialContentPlanRepositories) {}

  createDate(input: CreateCommemorativeDateServiceInput): Promise<CommemorativeDate> {
    return this.repositories.commemorativeDates.create(input);
  }

  listDates(onlyActive = false): Promise<CommemorativeDate[]> {
    return this.repositories.commemorativeDates.findAll(onlyActive);
  }

  setDateActive(id: string, isActive: boolean): Promise<CommemorativeDate> {
    return this.repositories.commemorativeDates.update(id, { isActive });
  }

  // Só datas ativas podem ser vinculadas — o formulário já oferece apenas
  // essas, mas a Server Action é um endpoint independente da tela.
  async createPlanItem(input: CreatePlanItemInput): Promise<SocialContentPlanItem> {
    if (input.title.trim().length === 0) {
      throw new Error("Informe o título do item de planejamento.");
    }
    assertHasChannel(input.channels);
    await this.assertCommemorativeDateIsUsable(input.commemorativeDateId);

    // Status inicial é sempre `ideia` (default da coluna) — ver Requirement
    // "Planejamento de posts de redes sociais".
    return this.repositories.socialContentPlanItems.create(input);
  }

  async updatePlanItem(id: string, input: UpdatePlanItemInput): Promise<SocialContentPlanItem> {
    const item = await this.repositories.socialContentPlanItems.findById(id);
    if (!item) {
      throw new Error("Item de planejamento não encontrado.");
    }
    if (input.title.trim().length === 0) {
      throw new Error("Informe o título do item de planejamento.");
    }
    assertHasChannel(input.channels);
    await this.assertCommemorativeDateIsUsable(input.commemorativeDateId);

    // Status não é editável pelo formulário: só muda por advanceStatus, que
    // valida a sequência do funil e registra o histórico.
    return this.repositories.socialContentPlanItems.update(id, input);
  }

  // Funil linear: avança exatamente um passo na sequência ideia → roteiro →
  // gravacao → edicao → agendado → publicado, registrando quem fez a
  // mudança (ver Requirement "Progressão de status do funil de conteúdo").
  async advanceStatus(id: string, userId: string | null): Promise<SocialContentPlanItem> {
    const item = await this.repositories.socialContentPlanItems.findById(id);
    if (!item) {
      throw new Error("Item de planejamento não encontrado.");
    }

    const currentIndex = SOCIAL_CONTENT_STATUS_SEQUENCE.indexOf(item.status);
    const nextStatus = SOCIAL_CONTENT_STATUS_SEQUENCE[currentIndex + 1];
    if (!nextStatus) {
      throw new Error("Item já está publicado — não há próximo status no funil.");
    }

    const updated = await this.repositories.socialContentPlanItems.update(id, {
      status: nextStatus,
      // O autor do avanço passa a ser o responsável pela etapa em que o item
      // acabou de entrar.
      responsibleId: userId,
    });

    await this.repositories.socialContentPlanItems.recordStatusEvent({
      itemId: id,
      fromStatus: item.status,
      toStatus: nextStatus,
      changedBy: userId,
    });

    return updated;
  }

  listByStatus(statuses?: SocialContentStatus[]): Promise<SocialContentPlanItem[]> {
    return this.repositories.socialContentPlanItems.listByStatus(statuses);
  }

  listStatusEvents(itemId: string): Promise<SocialContentStatusEvent[]> {
    return this.repositories.socialContentPlanItems.listStatusEvents(itemId);
  }

  // Datas comemorativas ativas que caem no mês + itens cuja data alvo cai no
  // mês (ver Requirement "Visão de calendário e de board"). `month` é 1-12.
  async listByMonth(year: number, month: number): Promise<MonthPlan> {
    const from = `${year}-${pad(month)}-01`;
    // Dia 0 do mês seguinte = último dia deste mês (Date normaliza mês 12).
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${pad(month)}-${pad(lastDay)}`;

    const [activeDates, items] = await Promise.all([
      this.repositories.commemorativeDates.findAll(true),
      this.repositories.socialContentPlanItems.listByTargetDateRange(from, to),
    ]);

    const dates = activeDates
      .map((date) => {
        const occursOn = resolveOccurrence(date, year, month);
        return occursOn ? { date, occursOn } : null;
      })
      .filter((occurrence): occurrence is CommemorativeDateOccurrence => occurrence !== null)
      .sort((a, b) => a.occursOn.localeCompare(b.occursOn));

    return { dates, items };
  }

  private async assertCommemorativeDateIsUsable(commemorativeDateId: string | null): Promise<void> {
    if (commemorativeDateId === null) return;

    const date = await this.repositories.commemorativeDates.findById(commemorativeDateId);
    if (!date) {
      throw new Error("Data comemorativa não encontrada.");
    }
    if (!date.isActive) {
      throw new Error("Data comemorativa inativa não pode ser vinculada a um item de planejamento.");
    }
  }
}
