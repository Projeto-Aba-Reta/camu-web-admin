"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories, type Repositories } from "@/lib/repositories";
import { PricingService } from "@/lib/services/pricing-service";
import { requireFinanceiroWrite, requirePrecificacaoAccess, requirePrinterWrite } from "@/lib/auth/pricing-access";
import type {
  MarginMode,
  MarketplaceChannel,
  PriceCalculation,
  PriceCalculationResult,
  SizeTier,
} from "@/types/pricing";

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

const CONFIGURACAO_PATH = "/precificacao/configuracao";
const CALCULAR_PATH = "/precificacao/calcular";
const HISTORICO_PATH = "/precificacao/historico";

export interface CostParametersFormInput {
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
  targetMarginPct: number;
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
  // Frações (0-1) — o componente converte de % antes de chamar a action.
  b2cMarginPct: number;
  b2cMarginMode: MarginMode;
  b2bMarginPct: number;
  b2bMarginMode: MarginMode;
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

// Código de porte: mesmo formato de sizeTierCodeSchema, sem "/" (ver
// design.md, Decisão 4). Normaliza aqui para a checagem de duplicidade e a
// gravação usarem o mesmo valor.
const SIZE_TIER_CODE_RE = /^[A-Z0-9]{1,4}$/;

export interface SizeTierFormInput {
  code: string;
  label: string;
  sortOrder: number;
}

export async function createSizeTierAction(input: SizeTierFormInput): Promise<ActionResult> {
  try {
    const user = await requireFinanceiroWrite();
    const repositories = await getRepositories();

    const code = input.code.trim().toUpperCase();
    if (!SIZE_TIER_CODE_RE.test(code)) {
      return { ok: false, error: "O código deve ter de 1 a 4 letras ou números (ex.: P, GG, XG)." };
    }
    if (await repositories.sizeTiers.findByCode(code)) {
      return { ok: false, error: `Já existe um porte com o código ${code}.` };
    }

    await repositories.sizeTiers.create({
      code,
      label: input.label.trim(),
      sortOrder: input.sortOrder,
      createdBy: user.id,
    });
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cadastrar o porte.") };
  }
}

// Só nome e ordem: o código é identidade imutável; portes de sistema também
// têm nome/ordem editáveis (o trigger do banco só barra alterar código/flag).
export async function updateSizeTierAction(code: string, input: { label: string; sortOrder: number }): Promise<ActionResult> {
  try {
    await requireFinanceiroWrite();
    const repositories = await getRepositories();
    await repositories.sizeTiers.update(code, { label: input.label.trim(), sortOrder: input.sortOrder });
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar o porte.") };
  }
}

export async function removeSizeTierAction(code: string): Promise<ActionResult> {
  try {
    await requireFinanceiroWrite();
    const repositories = await getRepositories();

    const tier = await repositories.sizeTiers.findByCode(code);
    if (!tier) {
      return { ok: false, error: "Porte não encontrado." };
    }
    if (tier.isSystem) {
      return { ok: false, error: "Portes de sistema (P, M e G) não podem ser removidos." };
    }
    const references = await repositories.sizeTiers.countReferences(code);
    if (references > 0) {
      return {
        ok: false,
        error: "Há peças ou faixas usando este porte — remova ou reclassifique-as antes de excluir o porte.",
      };
    }

    await repositories.sizeTiers.remove(code);
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível remover o porte.") };
  }
}

export interface CalculatePriceFormInput {
  // Omitir weightGrams/printHours quando productId tiver ficha de
  // fatiamento cadastrada para printerId (ver Requirement "Cálculo a
  // partir de uma ficha de fatiamento cadastrada").
  weightGrams?: number;
  printHours?: number;
  printerId: string;
  productId?: string;
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
      productId: input.productId,
      createdBy: user.id,
    };

    if (!input.chosenTier) {
      const preview = await pricingService.calculatePrice(calcInput);
      if (preview.suggestedTier?.ambiguous) {
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

export interface B2bPricingTierFormInput {
  minQuantity: number;
  targetMarginPct: number;
}

export async function createB2bPricingTierAction(input: B2bPricingTierFormInput): Promise<ActionResult> {
  try {
    const user = await requireFinanceiroWrite();
    const repositories = await getRepositories();
    await repositories.b2bPricingTiers.create({ ...input, createdBy: user.id });
    revalidatePath(CONFIGURACAO_PATH);
    revalidatePath(CALCULAR_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar a faixa de precificação B2B.") };
  }
}

export interface CalculateCompositePriceFormInput {
  productId: string;
  // Obrigatório: peça composta não tem porte classificado automaticamente, e
  // o porte determina a margem aplicada (ver design.md, Decisão 3).
  chosenTier: SizeTier;
}

export async function calculateCompositePriceAction(
  input: CalculateCompositePriceFormInput,
): Promise<CalculatePriceActionResult> {
  try {
    const user = await requirePrecificacaoAccess();

    if (!input.chosenTier) {
      return {
        ok: false,
        error: "Escolha o porte (P, M ou G) da peça composta antes de calcular — o porte determina a margem de lucro aplicada.",
      };
    }

    const repositories = await getRepositories();
    const pricingService = new PricingService(repositories);

    const saved = await pricingService.calculateAndSaveCompositePrice({
      productId: input.productId,
      chosenTier: input.chosenTier,
      createdBy: user.id,
    });
    revalidatePath(HISTORICO_PATH);
    return { ok: true, saved: true, result: saved };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível calcular o preço da peça composta.") };
  }
}
