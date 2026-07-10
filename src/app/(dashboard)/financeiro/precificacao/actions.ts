"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories, type Repositories } from "@/lib/repositories";
import { PricingService } from "@/lib/services/pricing-service";
import { requireFinanceiroWrite, requirePrecificacaoAccess, requirePrinterWrite } from "@/lib/auth/pricing-access";
import type { MarketplaceChannel, PriceCalculation, PriceCalculationResult, SizeTier } from "@/types/pricing";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function getRepositories(): Promise<Repositories> {
  const supabase = await createClient();
  return createRepositories(supabase);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const CONFIGURACAO_PATH = "/financeiro/precificacao/configuracao";
const CALCULAR_PATH = "/financeiro/precificacao/calcular";
const HISTORICO_PATH = "/financeiro/precificacao/historico";

export interface CostParametersFormInput {
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
}

export async function createCostParametersAction(
  input: CostParametersFormInput,
): Promise<ActionResult> {
  try {
    const user = await requireFinanceiroWrite();
    const repositories = await getRepositories();
    await repositories.costParameters.create({ ...input, createdBy: user.id });
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar os parâmetros de custo.") };
  }
}

export interface PrinterFormInput {
  name: string;
  model: string;
  depreciationPerHour: number;
}

export async function createPrinterAction(input: PrinterFormInput): Promise<ActionResult> {
  try {
    const user = await requirePrinterWrite();
    const repositories = await getRepositories();
    await repositories.printers.create({ ...input, createdBy: user.id });
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cadastrar a impressora.") };
  }
}

export async function setPrinterActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requirePrinterWrite();
    const repositories = await getRepositories();
    await repositories.printers.setActive(id, isActive);
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível alterar o status da impressora.") };
  }
}

export interface ChannelFeeFormInput {
  channel: MarketplaceChannel;
  percentageFee: number;
  fixedFee: number;
}

export async function createChannelFeeAction(input: ChannelFeeFormInput): Promise<ActionResult> {
  try {
    const user = await requireFinanceiroWrite();
    const repositories = await getRepositories();
    await repositories.channelFees.create({ ...input, createdBy: user.id });
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar a taxa do canal.") };
  }
}

export interface SizeTierRangeFormInput {
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
}

export async function createSizeTierRangeAction(input: SizeTierRangeFormInput): Promise<ActionResult> {
  try {
    await requireFinanceiroWrite();
    const repositories = await getRepositories();
    await repositories.sizeTierRanges.create(input);
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar a faixa de porte.") };
  }
}

export interface CalculatePriceFormInput {
  weightGrams: number;
  printHours: number;
  printerId: string;
  chosenTier?: SizeTier;
}

export interface CalculatePriceActionResult {
  ok: boolean;
  error?: string;
  saved?: boolean;
  result?: PriceCalculationResult | PriceCalculation;
}

// Sem chosenTier: calcula e só salva se o porte não for ambíguo. Ambíguo
// retorna o preview (não salvo) para a UI exigir a escolha manual (ver
// design.md, Decision 3). Com chosenTier: calcula e salva usando o porte
// escolhido no lugar do estado ambíguo.
export async function calculatePriceAction(
  input: CalculatePriceFormInput,
): Promise<CalculatePriceActionResult> {
  try {
    const user = await requirePrecificacaoAccess();
    const repositories = await getRepositories();
    const pricingService = new PricingService(repositories);

    const calcInput = {
      weightGrams: input.weightGrams,
      printHours: input.printHours,
      printerId: input.printerId,
      createdBy: user.id,
    };

    if (!input.chosenTier) {
      const preview = await pricingService.calculatePrice(calcInput);
      if (preview.suggestedTier.ambiguous) {
        return { ok: true, saved: false, result: preview };
      }
    }

    const saved = await pricingService.calculateAndSavePrice(calcInput, input.chosenTier);
    revalidatePath(HISTORICO_PATH);
    return { ok: true, saved: true, result: saved };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível calcular o preço.") };
  }
}
