-- Societário: acordo de sociedade, contribuição de capital, enquadramento
-- jurídico, gatilhos de migração, faturamento x teto do MEI e log de
-- decisões. Domínio restrito a Owner/Sócio, sem acesso de member.
-- Ver openspec/changes/societario-schema/design.md para o racional.

-- =============================================================================
-- 1. partnership_agreements / capital_contributions
-- =============================================================================

create table public.partnership_agreements (
  id uuid primary key default gen_random_uuid(),
  profit_split_rule text not null,
  exit_terms text,
  valid_from timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.partnership_agreements is
  'Registro versionado (append-only) da regra de divisão de lucro e condições de saída vigentes. O registro vigente é o de maior valid_from.';

create table public.capital_contributions (
  id uuid primary key default gen_random_uuid(),
  partner_profile_id uuid not null references public.profiles (id),
  amount numeric not null,
  contribution_date date not null,
  proof_reference text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.capital_contributions is
  'Aportes de capital por sócio (append-only) — correção é um novo registro, não edição do original.';

-- =============================================================================
-- 2. legal_entity_status / legal_migration_triggers
-- =============================================================================

create table public.legal_entity_status (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('mei', 'me')),
  cnpj text,
  titular_profile_id uuid references public.profiles (id),
  valid_from timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint legal_entity_status_titular_required_for_mei
    check (entity_type <> 'mei' or titular_profile_id is not null)
);

comment on table public.legal_entity_status is
  'Tipo de PJ vigente (append-only, versionado). O registro vigente é o de maior valid_from. Titular obrigatório apenas para MEI.';

create table public.legal_migration_triggers (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null unique check (
    trigger_type in (
      'faturamento_proximo_teto',
      'lancamento_assinatura_recorrente',
      'necessidade_mais_funcionarios',
      'investimento_externo'
    )
  ),
  status text not null default 'pendente' check (status in ('pendente', 'atingido')),
  reached_at timestamptz,
  notes text,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint legal_migration_triggers_reached_at_matches_status
    check ((status = 'atingido') = (reached_at is not null))
);

comment on table public.legal_migration_triggers is
  'Estado atual (não versionado) dos 4 gatilhos fixos de migração de MEI para ME.';

-- =============================================================================
-- 3. mei_ceiling_parameters / revenue_snapshots
-- =============================================================================

create table public.mei_ceiling_parameters (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  annual_ceiling numeric not null,
  created_by uuid references public.profiles (id) on delete set null
);

comment on table public.mei_ceiling_parameters is
  'Teto anual de faturamento do MEI por ano-calendário — configurável, não hardcoded no código.';

create table public.revenue_snapshots (
  id uuid primary key default gen_random_uuid(),
  reference_month date not null unique,
  monthly_revenue numeric not null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.revenue_snapshots is
  'Lançamento mensal manual de faturamento acumulado, um por mês de referência (primeiro dia do mês).';

-- View com o cálculo do percentual do teto do MEI atingido no ano corrente:
-- soma dos últimos 12 revenue_snapshots ÷ mei_ceiling_parameters do ano
-- corrente. security_invoker garante que a RLS das tabelas base seja
-- aplicada com o papel de quem consulta a view, não do dono da view.
-- FROM parte de mei_ceiling_parameters (não de uma subquery independente de
-- RLS) para que a view não retorne nenhuma linha a quem não tem acesso —
-- caso contrário um member sem permissão ainda enxergaria uma linha
-- "vazia" (só com o ano corrente) em vez de nenhum resultado, inconsistente
-- com o comportamento das tabelas base.
create view public.mei_ceiling_status
  with (security_invoker = true) as
select
  p.year,
  p.annual_ceiling,
  coalesce(r.revenue_last_12_months, 0) as revenue_last_12_months,
  case
    when p.annual_ceiling = 0 then null
    else coalesce(r.revenue_last_12_months, 0) / p.annual_ceiling
  end as percentage_reached
from public.mei_ceiling_parameters p
left join lateral (
  select sum(monthly_revenue) as revenue_last_12_months
  from (
    select monthly_revenue
    from public.revenue_snapshots
    order by reference_month desc
    limit 12
  ) recent
) r on true
where p.year = extract(year from now())::int;

comment on view public.mei_ceiling_status is
  'Percentual do teto anual do MEI já atingido no ano corrente, a partir dos últimos 12 revenue_snapshots.';

-- =============================================================================
-- 4. decision_log_entries
-- =============================================================================

create table public.decision_log_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  context text not null,
  decision text not null,
  alternatives_considered text,
  reasoning text,
  decided_at date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.decision_log_entries is
  'Log de decisões relevantes do negócio, no formato ADR já usado em camu-docs/05-decisoes/log-decisoes.md. Append-only.';

-- =============================================================================
-- 5. Row Level Security — uniformemente is_socio_or_owner() em todo o domínio
-- =============================================================================

alter table public.partnership_agreements enable row level security;
alter table public.capital_contributions enable row level security;
alter table public.legal_entity_status enable row level security;
alter table public.legal_migration_triggers enable row level security;
alter table public.mei_ceiling_parameters enable row level security;
alter table public.revenue_snapshots enable row level security;
alter table public.decision_log_entries enable row level security;

grant select, insert, update, delete on public.partnership_agreements to authenticated, service_role;
grant select, insert, update, delete on public.capital_contributions to authenticated, service_role;
grant select, insert, update, delete on public.legal_entity_status to authenticated, service_role;
grant select, insert, update, delete on public.legal_migration_triggers to authenticated, service_role;
grant select, insert, update, delete on public.mei_ceiling_parameters to authenticated, service_role;
grant select, insert, update, delete on public.revenue_snapshots to authenticated, service_role;
grant select, insert, update, delete on public.decision_log_entries to authenticated, service_role;
grant select on public.mei_ceiling_status to authenticated, service_role;

-- partnership_agreements: append-only — sem policy de update/delete, então
-- nenhum papel consegue alterar/apagar um registro já criado.
create policy "partnership_agreements_select" on public.partnership_agreements
  for select using (public.is_socio_or_owner());
create policy "partnership_agreements_insert" on public.partnership_agreements
  for insert with check (public.is_socio_or_owner());

-- capital_contributions: append-only.
create policy "capital_contributions_select" on public.capital_contributions
  for select using (public.is_socio_or_owner());
create policy "capital_contributions_insert" on public.capital_contributions
  for insert with check (public.is_socio_or_owner());

-- legal_entity_status: append-only, versionado.
create policy "legal_entity_status_select" on public.legal_entity_status
  for select using (public.is_socio_or_owner());
create policy "legal_entity_status_insert" on public.legal_entity_status
  for insert with check (public.is_socio_or_owner());

-- legal_migration_triggers: estado mutável in-place (sem delete — o
-- catálogo dos 4 gatilhos é fixo).
create policy "legal_migration_triggers_select" on public.legal_migration_triggers
  for select using (public.is_socio_or_owner());
create policy "legal_migration_triggers_insert" on public.legal_migration_triggers
  for insert with check (public.is_socio_or_owner());
create policy "legal_migration_triggers_update" on public.legal_migration_triggers
  for update using (public.is_socio_or_owner()) with check (public.is_socio_or_owner());

-- mei_ceiling_parameters: parâmetro configurável, atualizável por ano.
create policy "mei_ceiling_parameters_select" on public.mei_ceiling_parameters
  for select using (public.is_socio_or_owner());
create policy "mei_ceiling_parameters_insert" on public.mei_ceiling_parameters
  for insert with check (public.is_socio_or_owner());
create policy "mei_ceiling_parameters_update" on public.mei_ceiling_parameters
  for update using (public.is_socio_or_owner()) with check (public.is_socio_or_owner());

-- revenue_snapshots: um lançamento por mês, atualizável (não um novo
-- lançamento) para corrigir o mês já existente.
create policy "revenue_snapshots_select" on public.revenue_snapshots
  for select using (public.is_socio_or_owner());
create policy "revenue_snapshots_insert" on public.revenue_snapshots
  for insert with check (public.is_socio_or_owner());
create policy "revenue_snapshots_update" on public.revenue_snapshots
  for update using (public.is_socio_or_owner()) with check (public.is_socio_or_owner());

-- decision_log_entries: append-only.
create policy "decision_log_entries_select" on public.decision_log_entries
  for select using (public.is_socio_or_owner());
create policy "decision_log_entries_insert" on public.decision_log_entries
  for insert with check (public.is_socio_or_owner());
