-- Precificação de peças impressas em partes.
-- Ver openspec/changes/precificacao-de-pecas-em-partes/design.md para o
-- racional das decisões.
--
-- 1. product_parts — partes inline (não vendáveis) de uma peça composta, cada
--    uma com filamento (insumo do estoque), gramas, impressora e tempo
--    próprios. Diferente de product_components (que referencia peças vendáveis
--    do catálogo), a parte é um sub-item que carrega seus próprios dados de
--    custo e nunca vira uma peça do catálogo.
-- 2. materials — filamento passa a exigir unidade kg ou g, garantindo custo
--    por kg sempre resolvível e baixa de estoque consistente.
-- 3. material_stock_movements / thresholds — saldo de filamento normalizado
--    para gramas (unidade canônica), para que compra (em kg) e consumo (em g)
--    somem na mesma unidade.

-- =============================================================================
-- 1. product_parts — partes inline de peça composta
-- =============================================================================

create table public.product_parts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  quantity integer not null check (quantity > 0),
  material_id uuid references public.materials (id),
  piece_grams numeric not null default 0 check (piece_grams >= 0),
  support_grams numeric not null default 0 check (support_grams >= 0),
  printer_id uuid not null references public.printers (id),
  print_hours numeric not null check (print_hours > 0),
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (piece_grams > 0 or support_grams > 0)
);

comment on table public.product_parts is
  'Partes inline (não vendáveis) de uma peça composta — ver Requirement "Cadastro de parte inline de peça composta". Cada parte carrega filamento, gramas, impressora e tempo próprios; o custo agregado da composta soma o custo próprio de cada parte × quantidade (ver motor-de-calculo-de-preco). on delete cascade: remover a composta remove suas partes, sem afetar price_calculations salvos (que guardam snapshot).';
comment on column public.product_parts.material_id is
  'Insumo de filamento do estoque de onde o custo por kg é derivado. NULL => a parte usa o preço global de filamento por kg (fallback) — ver Requirement "Parte com filamento vinculado ao estoque de insumos".';
comment on column public.product_parts.piece_grams is
  'Gramas do filamento usadas na parte (excluindo suporte). piece_grams + support_grams alimentam o custo de filamento da parte.';

create index product_parts_product_id_idx on public.product_parts (product_id);

-- =============================================================================
-- 2. materials — filamento restrito a kg ou g
-- =============================================================================

-- Normaliza o saldo de filamento para gramas (unidade canônica de estoque)
-- ANTES de impor a restrição de unidade. Compras/ajustes/perdas foram gravados
-- na unidade do insumo (kg), enquanto o consumo da fila de impressão já era
-- gravado em gramas (piece_grams + support_grams) — por isso só as
-- movimentações não-consumo de filamentos cadastrados em kg são convertidas.
update public.material_stock_movements msm
set quantity = msm.quantity * 1000
from public.materials m
where m.id = msm.material_id
  and m.type = 'filamento'
  and m.unit = 'kg'
  and msm.movement_type <> 'consumo_producao';

update public.material_stock_thresholds mst
set minimum_quantity = mst.minimum_quantity * 1000
from public.materials m
where m.id = mst.material_id
  and m.type = 'filamento'
  and m.unit = 'kg';

-- Filamento SHALL ter unidade kg ou g (embalagem permanece com unidade livre)
-- — ver Requirement "Cadastro de insumo com custo de referência". A unidade é
-- a do reference_cost (R$/kg ou R$/g); o saldo em material_stock_movements é
-- sempre em gramas (ver design.md decisão 6).
alter table public.materials
  add constraint materials_filament_unit_kg_or_g
  check (type <> 'filamento' or unit in ('kg', 'g'));

comment on column public.materials.unit is
  'Unidade do reference_cost. Para filamento, restrita a kg ou g (constraint materials_filament_unit_kg_or_g). O saldo de estoque de filamento (material_stock_movements.quantity) é sempre em gramas, independente desta unidade — ver design.md decisão 6.';

-- =============================================================================
-- 3. Row Level Security — product_parts (mesma regra do catálogo/componentes)
-- =============================================================================

alter table public.product_parts enable row level security;

grant select, insert, update, delete on public.product_parts to authenticated, service_role;

-- Leitura ampla (Owner/Sócio/Produção/Financeiro/Marketing); escrita restrita a
-- Owner/Sócio/Produção — ver Requirement "Leitura ampla por Produção,
-- Financeiro e Marketing; escrita restrita a Produção".
create policy "product_parts_select" on public.product_parts
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

create policy "product_parts_insert" on public.product_parts
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_parts_update" on public.product_parts
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_parts_delete" on public.product_parts
  for delete using (public.is_socio_or_owner() or public.has_role('producao'));
