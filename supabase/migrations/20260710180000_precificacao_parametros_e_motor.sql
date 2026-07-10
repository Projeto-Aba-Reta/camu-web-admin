-- Precificação: parâmetros de custo, parque de impressoras, taxas por canal,
-- faixas de porte e histórico de cálculos.
-- Ver openspec/changes/precificacao-schema-motor-calculo/design.md.

-- =============================================================================
-- 1. cost_parameters — parâmetros globais de custo, versionados por vigência
-- =============================================================================

create table public.cost_parameters (
  id uuid primary key default gen_random_uuid(),
  filament_cost_per_kg numeric not null,
  energy_cost_per_kwh numeric not null,
  average_power_watts numeric not null,
  failure_reserve_pct numeric not null,
  packaging_cost numeric not null,
  valid_from timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.cost_parameters is
  'Nunca sofre UPDATE: alterar um valor insere nova linha com valid_from = now(). O vigente é sempre o de maior valid_from <= now().';
comment on column public.cost_parameters.failure_reserve_pct is
  'Fração (0-1) aplicada como reserva sobre o subtotal de custo, não percentual inteiro.';

create index cost_parameters_valid_from_idx on public.cost_parameters (valid_from desc);

-- =============================================================================
-- 2. printers — parque de impressoras, depreciação por hora versionada
-- =============================================================================

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null,
  depreciation_per_hour numeric not null,
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.printers is
  'Trocar depreciation_per_hour de uma máquina insere nova linha com o mesmo name, não edita a existente. is_active é a exceção: alternado in-place via UPDATE.';

create index printers_name_valid_from_idx on public.printers (name, valid_from desc);

-- =============================================================================
-- 3. channel_fees — comissão por canal de marketplace, versionada por vigência
-- =============================================================================

create table public.channel_fees (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('mercado_livre', 'shopee', 'tiktok_shop', 'amazon', 'shein')),
  percentage_fee numeric not null,
  fixed_fee numeric not null default 0,
  valid_from timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.channel_fees is
  'Vigência é independente por canal: o vigente de cada canal é o de maior valid_from <= now() dentre as linhas daquele canal.';

create index channel_fees_channel_valid_from_idx on public.channel_fees (channel, valid_from desc);

-- =============================================================================
-- 4. size_tier_ranges — faixas de referência de porte P/M/G
-- =============================================================================

create table public.size_tier_ranges (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('P', 'M', 'G')),
  min_weight_grams numeric not null,
  max_weight_grams numeric not null,
  min_print_hours numeric not null,
  max_print_hours numeric not null,
  valid_from timestamptz not null default now()
);

create index size_tier_ranges_valid_from_idx on public.size_tier_ranges (valid_from desc);

-- =============================================================================
-- 5. price_calculations — histórico imutável de cada cálculo executado
-- =============================================================================

create table public.price_calculations (
  id uuid primary key default gen_random_uuid(),
  weight_grams numeric not null,
  print_hours numeric not null,
  printer_id uuid not null references public.printers (id),
  cost_parameters_id uuid not null references public.cost_parameters (id),
  suggested_tier text,
  total_cost numeric not null,
  cost_breakdown jsonb not null,
  channel_prices jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.price_calculations is
  'Snapshot completo do resultado de um cálculo: nunca recalculado ou sobrescrito, mesmo que os parâmetros vigentes mudem depois.';

create index price_calculations_created_at_idx on public.price_calculations (created_at desc);

-- =============================================================================
-- 6. Row Level Security
-- =============================================================================

alter table public.cost_parameters enable row level security;
alter table public.printers enable row level security;
alter table public.channel_fees enable row level security;
alter table public.size_tier_ranges enable row level security;
alter table public.price_calculations enable row level security;

grant select, insert, update, delete on public.cost_parameters to authenticated, service_role;
grant select, insert, update, delete on public.printers to authenticated, service_role;
grant select, insert, update, delete on public.channel_fees to authenticated, service_role;
grant select, insert, update, delete on public.size_tier_ranges to authenticated, service_role;
grant select, insert, update, delete on public.price_calculations to authenticated, service_role;

-- cost_parameters: leitura Owner/Sócio/Financeiro/Produção; escrita (nova
-- vigência) só Owner/Sócio/Financeiro — Produção consulta mas não altera
-- parâmetros financeiros. Nunca UPDATE/DELETE (imutável).
create policy "cost_parameters_select" on public.cost_parameters
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

create policy "cost_parameters_insert" on public.cost_parameters
  for insert with check (public.is_socio_or_owner() or public.has_role('financeiro'));

-- printers: leitura Owner/Sócio/Produção/Financeiro; escrita (cadastro e
-- alternância de is_active) Owner/Sócio/Produção — parque físico é decisão
-- operacional, não financeira.
create policy "printers_select" on public.printers
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "printers_insert" on public.printers
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "printers_update" on public.printers
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

-- channel_fees: leitura Owner/Sócio/Financeiro/Produção; escrita só
-- Owner/Sócio/Financeiro (taxa de canal é responsabilidade financeira).
create policy "channel_fees_select" on public.channel_fees
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

create policy "channel_fees_insert" on public.channel_fees
  for insert with check (public.is_socio_or_owner() or public.has_role('financeiro'));

-- size_tier_ranges: mesma regra de leitura ampla; escrita restrita a
-- Owner/Sócio/Financeiro, mesmo racional de cost_parameters (faixas
-- alimentam a fórmula de custo/preço).
create policy "size_tier_ranges_select" on public.size_tier_ranges
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

create policy "size_tier_ranges_insert" on public.size_tier_ranges
  for insert with check (public.is_socio_or_owner() or public.has_role('financeiro'));

-- price_calculations: leitura ampla; escrita por qualquer usuário
-- autorizado a executar um cálculo (Owner/Sócio/Financeiro/Produção),
-- registrado em created_by pela aplicação. Sem UPDATE/DELETE (imutável).
create policy "price_calculations_select" on public.price_calculations
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

create policy "price_calculations_insert" on public.price_calculations
  for insert with check (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );
