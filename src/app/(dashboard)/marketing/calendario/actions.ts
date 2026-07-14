"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { SocialContentPlanService } from "@/lib/services/social-content-plan-service";
import { requireMarketingCalendarWrite } from "@/lib/auth/marketing-calendar-access";
import type { CommemorativeDateRuleType, SocialChannel } from "@/types/marketing";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const CALENDARIO_PATH = "/marketing/calendario";

async function getSocialContentPlanService(): Promise<SocialContentPlanService> {
  const supabase = await createClient();
  return new SocialContentPlanService(createRepositories(supabase));
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export interface CreateCommemorativeDateActionInput {
  name: string;
  ruleType: CommemorativeDateRuleType;
  ruleValue: string;
  category: string;
}

export async function createCommemorativeDateAction(
  input: CreateCommemorativeDateActionInput,
): Promise<ActionResult> {
  try {
    const user = await requireMarketingCalendarWrite();
    const service = await getSocialContentPlanService();
    await service.createDate({ ...input, createdBy: user.id });
    revalidatePath(CALENDARIO_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cadastrar a data comemorativa.") };
  }
}

export interface PlanItemActionInput {
  commemorativeDateId: string | null;
  title: string;
  channels: SocialChannel[];
  responsibleId: string | null;
  targetDate: string | null;
  notes: string | null;
}

export async function createPlanItemAction(input: PlanItemActionInput): Promise<ActionResult> {
  try {
    const user = await requireMarketingCalendarWrite();
    const service = await getSocialContentPlanService();
    await service.createPlanItem({ ...input, createdBy: user.id });
    revalidatePath(CALENDARIO_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível criar o item de planejamento.") };
  }
}

export async function updatePlanItemAction(itemId: string, input: PlanItemActionInput): Promise<ActionResult> {
  try {
    await requireMarketingCalendarWrite();
    const service = await getSocialContentPlanService();
    await service.updatePlanItem(itemId, input);
    revalidatePath(CALENDARIO_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar o item de planejamento.") };
  }
}

export async function advancePlanItemStatusAction(itemId: string): Promise<ActionResult> {
  try {
    const user = await requireMarketingCalendarWrite();
    const service = await getSocialContentPlanService();
    await service.advanceStatus(itemId, user.id);
    revalidatePath(CALENDARIO_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível avançar o status do item.") };
  }
}
