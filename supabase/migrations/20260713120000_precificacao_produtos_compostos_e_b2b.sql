-- Precificação: margem-alvo, produto composto (BOM) e faixas de
-- precificação B2B por volume.
-- Ver openspec/changes/precificacao-produtos-compostos-e-ficha-de-fatiamento/design.md.

-- =============================================================================
-- 1. cost_parameters — novo parâmetro de margem-alvo B2C
-- =============================================================================

alter table public.cost_parameters
  add column target_margin_pct numeric not null default 0;

comment on column public.cost_parameters.target_margin_pct is
  'Fração (0-1) de margem-alvo B2C aplicada sobre o custo antes da taxa de canal. Default 0 preserva o preço de equilíbrio anterior a este parâmetro.';

-- =============================================================================
-- 2. products — tipo de peça (simples ou composta)
-- =============================================================================

alter table public.products
  add column product_type text not null default 'simples' check (product_type in ('simples', 'composta'));

comment on column public.products.product_type is
  'Peça composta referencia outras peças como componentes via product_components — ver Requirement "Tipo de peça simples ou composta".';

-- =============================================================================
-- 3. price_calculations — suporte a cálculo derivado de ficha de fatiamento,
--    a cálculo agregado de peça composta e a preço B2B por faixa
-- =============================================================================

-- weight_grams/print_hours/printer_id passam a ser nullable: um cálculo de
-- peça composta não tem um único peso/tempo/impressora, e sim um breakdown
-- por componente (component_breakdown). O CHECK abaixo garante que as duas
-- formas nunca se misturem no mesmo registro.
alter table public.price_calculations
  alter column weight_grams drop not null,
  alter column print_hours drop not null,
  alter column printer_id drop not null;

alter table public.price_calculations
  add column product_id uuid references public.products (id) on delete set null,
  add column slicing_sheet_id uuid references public.product_slicing_sheets (id) on delete set null,
  add column component_breakdown jsonb,
  add column b2b_prices jsonb not null default '[]'::jsonb;

comment on column public.price_calculations.product_id is
  'Peça a que este cálculo se refere (direta, se calculado a partir do formulário, ou indireta, se disparado automaticamente ao agregar um componente sem cálculo salvo — ver Requirement "Componente sem cálculo salvo mas com ficha de fatiamento").';
comment on column public.price_calculations.slicing_sheet_id is
  'Ficha de fatiamento que originou peso/tempo deste cálculo, quando não digitados manualmente — ver Requirement "Cálculo a partir de uma ficha de fatiamento cadastrada".';
comment on column public.price_calculations.component_breakdown is
  'Preenchido apenas em cálculo de peça composta: array de {componentProductId, quantity, unitCost, totalCost}. Mutuamente exclusivo com weight_grams/print_hours/printer_id (ver CHECK).';
comment on column public.price_calculations.b2b_prices is
  'Preço/margem por faixa B2B vigente no momento do cálculo, mesmo racional de channel_prices — snapshot imutável.';

alter table public.price_calculations
  add constraint price_calculations_simple_xor_composite check (
    (component_breakdown is null and weight_grams is not null and print_hours is not null and printer_id is not null)
    or
    (component_breakdown is not null and weight_grams is null and print_hours is null and printer_id is null)
  );

-- =============================================================================
-- 4. product_components — componentes de uma peça composta, com quantidade
-- =============================================================================

create table public.product_components (
  id uuid primary key default gen_random_uuid(),
  parent_product_id uuid not null references public.products (id) on delete cascade,
  component_product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (parent_product_id, component_product_id),
  check (parent_product_id <> component_product_id)
);

comment on table public.product_components is
  'Composição (BOM) de uma peça composta: cada linha é um componente e sua quantidade no conjunto. Validação de ausência de ciclo transitivo é responsabilidade da camada de serviço (ver design.md decisão 3) — não expressável como CHECK simples.';

create index product_components_parent_id_idx on public.product_components (parent_product_id);
create index product_components_component_id_idx on public.product_components (component_product_id);

-- =============================================================================
-- 5. b2b_pricing_tiers — faixas de precificação B2B por volume, versionadas
-- =============================================================================

create table public.b2b_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  min_quantity integer not null check (min_quantity > 0),
  target_margin_pct numeric not null,
  valid_from timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.b2b_pricing_tiers is
  'Preço B2B = custo total × (1 + target_margin_pct), sem taxa de canal. Mesmo padrão de versionamento de channel_fees: cada faixa (por min_quantity) tem seu próprio histórico de valid_from, sem sobrescrever registros existentes.';

create index b2b_pricing_tiers_min_quantity_valid_from_idx
  on public.b2b_pricing_tiers (min_quantity, valid_from desc);

-- =============================================================================
-- 6. Row Level Security
-- =============================================================================

alter table public.product_components enable row level security;
alter table public.b2b_pricing_tiers enable row level security;

grant select, insert, update, delete on public.product_components to authenticated, service_role;
grant select, insert, update, delete on public.b2b_pricing_tiers to authenticated, service_role;

-- product_components: mesma regra de acesso do catálogo (products) — leitura
-- ampla (Owner/Sócio/Produção/Financeiro/Vendas), escrita restrita a
-- Owner/Sócio/Produção — ver Requirement "Leitura ampla por Produção,
-- Financeiro e Vendas; escrita restrita a Produção".
create policy "product_components_select" on public.product_components
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketplace-vendas')
  );

create policy "product_components_insert" on public.product_components
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_components_delete" on public.product_components
  for delete using (public.is_socio_or_owner() or public.has_role('producao'));

-- b2b_pricing_tiers: mesma regra de cost_parameters/channel_fees — leitura
-- Owner/Sócio/Financeiro/Produção; escrita só Owner/Sócio/Financeiro (faixa
-- B2B é responsabilidade financeira). Nunca UPDATE/DELETE (imutável,
-- versionada por valid_from).
create policy "b2b_pricing_tiers_select" on public.b2b_pricing_tiers
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

create policy "b2b_pricing_tiers_insert" on public.b2b_pricing_tiers
  for insert with check (public.is_socio_or_owner() or public.has_role('financeiro'));
