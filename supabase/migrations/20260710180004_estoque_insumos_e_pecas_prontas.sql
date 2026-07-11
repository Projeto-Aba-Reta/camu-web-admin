-- Estoque: catálogo de insumos, movimentação e alerta de estoque baixo,
-- e estoque de peças prontas.
-- Ver openspec/changes/estoque-schema/design.md para o racional das decisões.

-- =============================================================================
-- 1. materials — catálogo de insumos (filamento por tipo/cor, embalagem)
-- =============================================================================

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('filamento', 'embalagem')),
  unit text not null,
  reference_cost numeric not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.materials.reference_cost is
  'Custo de referência próprio do insumo (R$/unit), independente de cost_parameters.filament_cost_per_kg — ver design.md decisão 2. Permite variação por cor/fornecedor sem exigir novo parâmetro global.';

-- =============================================================================
-- 2. material_stock_movements — log append-only de entradas/saídas de insumo
-- =============================================================================

create table public.material_stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id),
  quantity numeric not null,
  movement_type text not null check (
    movement_type in ('compra', 'consumo_producao', 'perda_refugo', 'ajuste_manual')
  ),
  printer_id uuid references public.printers (id),
  product_id uuid references public.products (id),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.material_stock_movements is
  'Append-only: nunca sofre UPDATE/DELETE. Saldo é sempre SUM(quantity) — ver design.md decisão 1 e view material_stock_balances. quantity positiva = entrada, negativa = saída.';
comment on column public.material_stock_movements.printer_id is
  'Preenchido quando movement_type = consumo_producao (qual impressora consumiu o insumo).';
comment on column public.material_stock_movements.product_id is
  'Peça que consumiu o insumo, quando aplicável e informado (ver design.md decisão 4).';

create index material_stock_movements_material_id_idx on public.material_stock_movements (material_id);

-- Saldo derivado por insumo: LEFT JOIN garante que todo material apareça,
-- inclusive um recém-cadastrado sem nenhuma movimentação ainda (saldo 0) —
-- ver Requirement "Insumo sem limite configurado nunca é sinalizado".
-- security_invoker = true: sem isso a view rodaria com os privilégios do
-- owner da view (que faz BYPASSRLS em migrations), vazando saldo para roles
-- sem select em material_stock_movements — a RLS deve valer para quem
-- consulta a view, não para quem a criou.
create view public.material_stock_balances
with (security_invoker = true)
as
select
  m.id as material_id,
  coalesce(sum(msm.quantity), 0) as balance
from public.materials m
left join public.material_stock_movements msm on msm.material_id = m.id
group by m.id;

-- =============================================================================
-- 3. material_stock_thresholds — limite mínimo configurável por insumo
-- =============================================================================

create table public.material_stock_thresholds (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique references public.materials (id),
  minimum_quantity numeric not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.material_stock_thresholds is
  'Um insumo sem linha aqui nunca é sinalizado como estoque baixo, independente do saldo (ver design.md decisão 5).';

-- =============================================================================
-- 4. product_stock_movements — log append-only de entradas/saídas de peça pronta
-- =============================================================================

create table public.product_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  quantity numeric not null,
  movement_type text not null check (
    movement_type in ('producao', 'venda', 'perda', 'ajuste_manual')
  ),
  material_stock_movement_id uuid references public.material_stock_movements (id),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.product_stock_movements is
  'Append-only: nunca sofre UPDATE/DELETE. Saldo é sempre SUM(quantity) — ver view product_stock_balances. quantity positiva = entrada (produção), negativa = saída (venda/perda/ajuste).';
comment on column public.product_stock_movements.material_stock_movement_id is
  'Vínculo opcional e rastreável com a saída de insumo que originou esta produção (ver design.md decisão 4). Vínculo é decidido no service, não obrigatório por trigger de banco.';

create index product_stock_movements_product_id_idx on public.product_stock_movements (product_id);

create view public.product_stock_balances
with (security_invoker = true)
as
select
  p.id as product_id,
  coalesce(sum(psm.quantity), 0) as balance
from public.products p
left join public.product_stock_movements psm on psm.product_id = p.id
group by p.id;

-- =============================================================================
-- 5. Row Level Security
-- =============================================================================

alter table public.materials enable row level security;
alter table public.material_stock_movements enable row level security;
alter table public.material_stock_thresholds enable row level security;
alter table public.product_stock_movements enable row level security;

grant select, insert, update, delete on public.materials to authenticated, service_role;
grant select, insert, update, delete on public.material_stock_movements to authenticated, service_role;
grant select, insert, update, delete on public.material_stock_thresholds to authenticated, service_role;
grant select, insert, update, delete on public.product_stock_movements to authenticated, service_role;
grant select on public.material_stock_balances to authenticated, service_role;
grant select on public.product_stock_balances to authenticated, service_role;

-- Leitura ampla (Owner/Sócio/Produção/Financeiro) em todas as tabelas deste
-- change; escrita restrita a Owner/Sócio/Produção — Financeiro só consulta
-- valor de estoque para o fechamento mensal (ver design.md decisão 6).
create policy "materials_select" on public.materials
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "materials_insert" on public.materials
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "materials_update" on public.materials
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

-- material_stock_movements: append-only, sem policy de update/delete
-- (imutável, mesmo critério de price_calculations em precificacao-schema).
create policy "material_stock_movements_select" on public.material_stock_movements
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "material_stock_movements_insert" on public.material_stock_movements
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "material_stock_thresholds_select" on public.material_stock_thresholds
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "material_stock_thresholds_insert" on public.material_stock_thresholds
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "material_stock_thresholds_update" on public.material_stock_thresholds
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

-- product_stock_movements: append-only, mesma regra de leitura/escrita.
create policy "product_stock_movements_select" on public.product_stock_movements
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "product_stock_movements_insert" on public.product_stock_movements
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));
