-- Precificação: margem de lucro por faixa de porte (P/M/G), com modo
-- somar/substituir independente para B2C e B2B, e snapshot da margem
-- efetiva aplicada em cada cálculo.
-- Ver openspec/changes/margem-por-porte-e-simulador-de-precificacao/design.md.

-- =============================================================================
-- 1. size_tier_ranges — margem de lucro própria de cada faixa de porte
-- =============================================================================

-- Os defaults (0 / 'somar') são o que garante retrocompatibilidade: margem 0
-- somada à margem-alvo global reproduz exatamente a conta anterior a esta
-- migration, sem backfill. size_tier_ranges continua imutável e versionada
-- por valid_from — nenhuma linha existente é reescrita.
alter table public.size_tier_ranges
  add column b2c_margin_pct numeric not null default 0,
  add column b2c_margin_mode text not null default 'somar'
    check (b2c_margin_mode in ('somar', 'substituir')),
  add column b2b_margin_pct numeric not null default 0,
  add column b2b_margin_mode text not null default 'somar'
    check (b2b_margin_mode in ('somar', 'substituir'));

alter table public.size_tier_ranges
  add constraint size_tier_ranges_margins_non_negative
    check (b2c_margin_pct >= 0 and b2b_margin_pct >= 0);

comment on column public.size_tier_ranges.b2c_margin_pct is
  'Fração (0-1) de margem de lucro desta faixa de porte aplicada ao preço B2C. Não-negativa: para praticar margem menor que a margem-alvo global, use o modo substituir.';
comment on column public.size_tier_ranges.b2c_margin_mode is
  'somar: margem efetiva B2C = cost_parameters.target_margin_pct + b2c_margin_pct. substituir: margem efetiva B2C = b2c_margin_pct (a margem-alvo global é ignorada).';
comment on column public.size_tier_ranges.b2b_margin_pct is
  'Fração (0-1) de margem de lucro desta faixa de porte aplicada ao preço B2B. Resolvida independentemente da margem B2C.';
comment on column public.size_tier_ranges.b2b_margin_mode is
  'somar: margem efetiva B2B = margem-alvo da faixa de volume + b2b_margin_pct. substituir: margem efetiva B2B = b2b_margin_pct. A base do B2B é sempre a margem da faixa de volume (b2b_pricing_tiers), nunca a margem-alvo B2C.';

-- =============================================================================
-- 2. price_calculations — snapshot da margem efetiva B2C aplicada
-- =============================================================================

-- Nullable: cálculos salvos antes desta migration não têm margem registrada e
-- não são recalculados nem migrados (price_calculations é snapshot imutável).
-- A margem efetiva de cada faixa B2B vai dentro de b2b_prices, que já é jsonb.
alter table public.price_calculations
  add column effective_b2c_margin jsonb;

comment on column public.price_calculations.effective_b2c_margin is
  'Snapshot imutável da margem efetiva B2C aplicada: { basePct, tierMarginPct, mode, effectivePct }. Permite auditar de onde veio o preço mesmo depois que a faixa de porte for alterada. null nos cálculos anteriores à margem por porte.';

-- =============================================================================
-- 3. Row Level Security
-- =============================================================================

-- Nenhuma policy nova: as colunas acima herdam as policies já existentes de
-- size_tier_ranges (escrita Owner/Sócio/Financeiro) e de price_calculations.
