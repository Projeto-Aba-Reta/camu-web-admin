-- Calendário de marketing e planejamento de conteúdo de redes sociais:
-- datas comemorativas próprias de marketing e itens de conteúdo percorrendo
-- o funil ideia → roteiro → gravacao → edicao → agendado → publicado.
-- Ver openspec/changes/calendario-marketing-redes-sociais/design.md para o
-- racional das decisões (em especial a lista de datas própria, desacoplada
-- do organizador de ideação de produtos).

-- =============================================================================
-- 1. commemorative_dates_marketing — datas comemorativas de marketing
-- =============================================================================

create table public.commemorative_dates_marketing (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_type text not null check (rule_type in ('fixa', 'movel')),
  rule_value text not null,
  category text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Data fixa repete todo ano no mesmo dia → 'MM-DD'. Data móvel (Dia das
  -- Mães, Black Friday) muda de dia a cada ano e não tem regra calculável
  -- aqui → guarda a ocorrência concreta 'YYYY-MM-DD', atualizada a cada
  -- ciclo. Assim as duas resolvem para um dia do mês exibido no calendário
  -- sem cálculo especial.
  constraint commemorative_dates_marketing_rule_value_format check (
    (rule_type = 'fixa' and rule_value ~ '^\d{2}-\d{2}$')
    or (rule_type = 'movel' and rule_value ~ '^\d{4}-\d{2}-\d{2}$')
  )
);

comment on column public.commemorative_dates_marketing.rule_value is
  'fixa: ''MM-DD'' (repete todo ano). movel: ''YYYY-MM-DD'' (ocorrência concreta do ciclo atual).';

create index commemorative_dates_marketing_is_active_idx
  on public.commemorative_dates_marketing (is_active);

-- =============================================================================
-- 2. social_content_plan_items — posts no funil de produção de conteúdo
-- =============================================================================

create table public.social_content_plan_items (
  id uuid primary key default gen_random_uuid(),
  -- Nem todo post nasce de uma data comemorativa (bastidores, resposta a
  -- tendência) — ver design.md decisão "Post vinculado a uma data
  -- comemorativa é opcional".
  commemorative_date_id uuid references public.commemorative_dates_marketing (id) on delete set null,
  title text not null,
  -- Canais de rede social, deliberadamente distintos dos canais de venda de
  -- product_channel_listings (marketplaces): quem publica um Reels não
  -- publica na Shopee.
  channel text not null check (channel in ('instagram', 'tiktok', 'youtube', 'kwai', 'facebook', 'outro')),
  status text not null default 'ideia' check (
    status in ('ideia', 'roteiro', 'gravacao', 'edicao', 'agendado', 'publicado')
  ),
  responsible_id uuid references public.profiles (id) on delete set null,
  target_date date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column public.social_content_plan_items.status is
  'Funil linear; só avança um passo por vez, na sequência ideia → roteiro → gravacao → edicao → agendado → publicado (validado no SocialContentPlanService).';

create index social_content_plan_items_status_idx on public.social_content_plan_items (status);
create index social_content_plan_items_target_date_idx on public.social_content_plan_items (target_date);

-- =============================================================================
-- 3. social_content_plan_status_events — histórico de transições de status
-- =============================================================================

-- Append-only: o item guarda só o status atual; cada avanço registra aqui
-- quem mudou e quando — ver Requirement "Progressão de status do funil de
-- conteúdo" ("mantendo o histórico de quem fez a alteração"). O audit_log
-- existente não serve: a policy de insert dele exige Owner, e quem opera
-- esta tela é a role marketplace-vendas.
create table public.social_content_plan_status_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.social_content_plan_items (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index social_content_plan_status_events_item_id_idx
  on public.social_content_plan_status_events (item_id, changed_at);

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

alter table public.commemorative_dates_marketing enable row level security;
alter table public.social_content_plan_items enable row level security;
alter table public.social_content_plan_status_events enable row level security;

grant select, insert, update, delete on public.commemorative_dates_marketing to authenticated, service_role;
grant select, insert, update, delete on public.social_content_plan_items to authenticated, service_role;
-- Histórico é append-only: sem update/delete.
grant select, insert on public.social_content_plan_status_events to authenticated, service_role;

-- Leitura e escrita: Owner/Sócio ou role marketplace-vendas — mesma regra
-- para as duas tabelas (ver Requirement "Acesso ao calendário de
-- marketing"). A role marketplace-vendas já cobre, segundo camu-docs, a
-- operação de vendas/conteúdo do sócio responsável; nenhuma role nova de
-- "Marketing" é criada.
create policy "commemorative_dates_marketing_select" on public.commemorative_dates_marketing
  for select using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "commemorative_dates_marketing_insert" on public.commemorative_dates_marketing
  for insert with check (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "commemorative_dates_marketing_update" on public.commemorative_dates_marketing
  for update using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'))
  with check (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_items_select" on public.social_content_plan_items
  for select using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_items_insert" on public.social_content_plan_items
  for insert with check (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_items_update" on public.social_content_plan_items
  for update using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'))
  with check (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_status_events_select" on public.social_content_plan_status_events
  for select using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_status_events_insert" on public.social_content_plan_status_events
  for insert with check (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));
