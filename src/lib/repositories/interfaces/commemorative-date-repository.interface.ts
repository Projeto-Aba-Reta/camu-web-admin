import type { CommemorativeDate, CommemorativeDateRuleType } from "@/types/marketing";

export interface CreateCommemorativeDateInput {
  name: string;
  ruleType: CommemorativeDateRuleType;
  ruleValue: string;
  category: string;
  createdBy: string | null;
}

export interface UpdateCommemorativeDateInput {
  name?: string;
  ruleType?: CommemorativeDateRuleType;
  ruleValue?: string;
  category?: string;
  isActive?: boolean;
}

export interface ICommemorativeDateRepository {
  findById(id: string): Promise<CommemorativeDate | null>;
  // Sem argumento retorna todas (tela de cadastro); com `true` só as ativas,
  // que são as únicas que aparecem no calendário e podem ser vinculadas a
  // novos itens de planejamento.
  findAll(onlyActive?: boolean): Promise<CommemorativeDate[]>;
  create(input: CreateCommemorativeDateInput): Promise<CommemorativeDate>;
  update(id: string, input: UpdateCommemorativeDateInput): Promise<CommemorativeDate>;
}
