"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  B2bPricingTier,
  ChannelFee,
  CostParameters,
  MarketplaceChannel,
  SizeTier,
  SizeTierRange,
} from "@/types/pricing";

// Rascunho de precificação: o que os formulários da tela de configuração têm
// preenchido agora, sem nada salvo. O simulador sobrepõe isso aos parâmetros
// vigentes para projetar "se salvar" antes de qualquer gravação (ver
// design.md, Decisão 5).
//
// Cada formulário edita uma entrada por vez (a faixa de porte selecionada, o
// canal selecionado, a faixa de volume selecionada), então o rascunho guarda
// uma entrada por seção — não a lista inteira.

export interface CostParametersDraft {
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
  targetMarginPct: number;
}

export interface SizeTierDraft {
  tier: SizeTier;
  minWeightGrams: number;
  maxWeightGrams: number;
  minPrintHours: number;
  maxPrintHours: number;
  b2cMarginPct: number;
  b2cMarginMode: SizeTierRange["b2cMarginMode"];
  b2bMarginPct: number;
  b2bMarginMode: SizeTierRange["b2bMarginMode"];
}

export interface ChannelFeeDraft {
  channel: MarketplaceChannel;
  percentageFee: number;
  fixedFee: number;
}

export interface B2bTierDraft {
  minQuantity: number;
  targetMarginPct: number;
}

interface PricingDraft {
  costParameters?: CostParametersDraft;
  sizeTier?: SizeTierDraft;
  channelFee?: ChannelFeeDraft;
  b2bTier?: B2bTierDraft;
}

interface PricingDraftContextValue {
  draft: PricingDraft;
  setCostParameters: (draft: CostParametersDraft) => void;
  setSizeTier: (draft: SizeTierDraft) => void;
  setChannelFee: (draft: ChannelFeeDraft) => void;
  setB2bTier: (draft: B2bTierDraft) => void;
}

const PricingDraftContext = createContext<PricingDraftContextValue | null>(null);

export function PricingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PricingDraft>({});

  const setCostParameters = useCallback((costParameters: CostParametersDraft) => {
    setDraft((current) => ({ ...current, costParameters }));
  }, []);
  const setSizeTier = useCallback((sizeTier: SizeTierDraft) => {
    setDraft((current) => ({ ...current, sizeTier }));
  }, []);
  const setChannelFee = useCallback((channelFee: ChannelFeeDraft) => {
    setDraft((current) => ({ ...current, channelFee }));
  }, []);
  const setB2bTier = useCallback((b2bTier: B2bTierDraft) => {
    setDraft((current) => ({ ...current, b2bTier }));
  }, []);

  const value = useMemo(
    () => ({ draft, setCostParameters, setSizeTier, setChannelFee, setB2bTier }),
    [draft, setCostParameters, setSizeTier, setChannelFee, setB2bTier],
  );

  return <PricingDraftContext.Provider value={value}>{children}</PricingDraftContext.Provider>;
}

export function usePricingDraft(): PricingDraft {
  return useContext(PricingDraftContext)?.draft ?? {};
}

// Os hooks de publicação viram no-op fora do provider: os formulários
// continuam usáveis em telas que não montam o simulador.
const noop = () => {};

export function useCostParametersDraft(): (draft: CostParametersDraft) => void {
  return useContext(PricingDraftContext)?.setCostParameters ?? noop;
}

export function useSizeTierDraft(): (draft: SizeTierDraft) => void {
  return useContext(PricingDraftContext)?.setSizeTier ?? noop;
}

export function useChannelFeeDraft(): (draft: ChannelFeeDraft) => void {
  return useContext(PricingDraftContext)?.setChannelFee ?? noop;
}

export function useB2bTierDraft(): (draft: B2bTierDraft) => void {
  return useContext(PricingDraftContext)?.setB2bTier ?? noop;
}

// ---------------------------------------------------------------------------
// Merge: vigente + rascunho
// ---------------------------------------------------------------------------

// A entrada em edição substitui a vigente de mesma chave (mesmo porte, mesmo
// canal, mesma quantidade mínima); uma chave nova entra na lista. O que não
// foi tocado continua vigente.

export function mergeCostParameters(
  current: CostParameters | null,
  draft: CostParametersDraft | undefined,
): CostParameters | null {
  if (!current) return null;
  if (!draft) return current;
  return { ...current, ...draft };
}

export function mergeSizeTierRanges(
  current: SizeTierRange[],
  draft: SizeTierDraft | undefined,
): SizeTierRange[] {
  if (!draft) return current;
  const vigente = current.find((range) => range.tier === draft.tier);
  const merged: SizeTierRange = {
    id: vigente?.id ?? `rascunho-${draft.tier}`,
    validFrom: vigente?.validFrom ?? new Date().toISOString(),
    ...draft,
  };
  const others = current.filter((range) => range.tier !== draft.tier);
  return [...others, merged];
}

export function mergeChannelFees(current: ChannelFee[], draft: ChannelFeeDraft | undefined): ChannelFee[] {
  if (!draft) return current;
  const vigente = current.find((fee) => fee.channel === draft.channel);
  const merged: ChannelFee = {
    id: vigente?.id ?? `rascunho-${draft.channel}`,
    validFrom: vigente?.validFrom ?? new Date().toISOString(),
    createdBy: vigente?.createdBy ?? null,
    ...draft,
  };
  const others = current.filter((fee) => fee.channel !== draft.channel);
  return [...others, merged].sort((a, b) => a.channel.localeCompare(b.channel));
}

export function mergeB2bTiers(current: B2bPricingTier[], draft: B2bTierDraft | undefined): B2bPricingTier[] {
  if (!draft || !draft.minQuantity) return current;
  const vigente = current.find((tier) => tier.minQuantity === draft.minQuantity);
  const merged: B2bPricingTier = {
    id: vigente?.id ?? `rascunho-${draft.minQuantity}`,
    validFrom: vigente?.validFrom ?? new Date().toISOString(),
    createdBy: vigente?.createdBy ?? null,
    ...draft,
  };
  const others = current.filter((tier) => tier.minQuantity !== draft.minQuantity);
  return [...others, merged].sort((a, b) => a.minQuantity - b.minQuantity);
}
