-- Ficha de fatiamento: cadastro, por peça do catálogo e por impressora, dos
-- dados exportados pela fatiadora (slicer) — filamentos usados (peça +
-- suporte, por cor) e tempo de impressão. fila-de-impressao passa a
-- derivar os materiais consumidos e o horário estimado de término dessa
-- ficha, em vez de escolha manual de 1 material e cálculo de peso via
-- price_calculations.
-- Ver openspec/changes/ficha-de-fatiamento/design.md para o racional das
-- decisões.

-- =============================================================================
-- 1. product_slicing_sheets — cabeçalho da ficha (peça + impressora + tempo)
-- =============================================================================

create table public.product_slicing_sheets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  printer_id uuid not null references public.printers (id),
  print_hours numeric not null check (print_hours > 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, printer_id)
);

comment on table public.product_slicing_sheets is
  'Mutável in-place (mesmo padrão de materials): reeditar/refatiar a mesma peça+impressora atualiza a ficha existente, não versiona histórico — ver design.md decisão "Uma ficha por combinação peça+impressora, mutável in-place".';

create index product_slicing_sheets_product_id_idx on public.product_slicing_sheets (product_id);

-- =============================================================================
-- 2. product_slicing_sheet_materials — linhas de material da ficha
-- =============================================================================

create table public.product_slicing_sheet_materials (
  id uuid primary key default gen_random_uuid(),
  slicing_sheet_id uuid not null references public.product_slicing_sheets (id) on delete cascade,
  material_id uuid not null references public.materials (id),
  piece_grams numeric not null default 0 check (piece_grams >= 0),
  support_grams numeric not null default 0 check (support_grams >= 0),
  check (piece_grams > 0 or support_grams > 0)
);

comment on table public.product_slicing_sheet_materials is
  'Substituídas por completo (delete + insert) a cada reedição da ficha pai, não editadas linha a linha — ver design.md. piece_grams alimenta o peso derivado da peça (Requirement "Peso da peça derivado da ficha"); piece_grams + support_grams alimentam a baixa de estoque na conclusão da impressão.';

create index product_slicing_sheet_materials_sheet_id_idx
  on public.product_slicing_sheet_materials (slicing_sheet_id);

-- =============================================================================
-- 3. print_queue_items — remove material_id (agora multi-material via
--    snapshot), adiciona expected_finish_at
-- =============================================================================

alter table public.print_queue_items drop column material_id;

alter table public.print_queue_items add column expected_finish_at timestamptz;

comment on column public.print_queue_items.expected_finish_at is
  'started_at + tempo de impressão da ficha de fatiamento usada no início ("play"). Usado pelo cronômetro no cliente e pela rotina de conclusão automática (itens imprimindo com expected_finish_at <= now()) — ver Requirement "Conclusão automática por tempo esgotado".';

-- =============================================================================
-- 4. print_queue_item_materials — snapshot dos materiais da ficha, copiado
--    no início da impressão
-- =============================================================================

create table public.print_queue_item_materials (
  id uuid primary key default gen_random_uuid(),
  print_queue_item_id uuid not null references public.print_queue_items (id) on delete cascade,
  material_id uuid not null references public.materials (id),
  piece_grams numeric not null default 0 check (piece_grams >= 0),
  support_grams numeric not null default 0 check (support_grams >= 0)
);

comment on table public.print_queue_item_materials is
  'Snapshot imutável das linhas de product_slicing_sheet_materials no momento do "play" (mesmo racional de price_calculations: um item já imprimindo não muda se a ficha for reeditada depois) — ver design.md decisão "Ficha é snapshotada no item da fila no momento do play". Uma linha por material vira uma movimentação consumo_producao na conclusão.';

create index print_queue_item_materials_item_id_idx
  on public.print_queue_item_materials (print_queue_item_id);

-- =============================================================================
-- 5. Row Level Security
-- =============================================================================

alter table public.product_slicing_sheets enable row level security;
alter table public.product_slicing_sheet_materials enable row level security;
alter table public.print_queue_item_materials enable row level security;

grant select, insert, update, delete on public.product_slicing_sheets to authenticated, service_role;
grant select, insert, update, delete on public.product_slicing_sheet_materials to authenticated, service_role;
grant select, insert, update, delete on public.print_queue_item_materials to authenticated, service_role;

-- product_slicing_sheets / product_slicing_sheet_materials: mesma regra de
-- acesso do catálogo (products) — leitura ampla (Owner/Sócio/Produção/
-- Financeiro/Vendas), escrita restrita a Owner/Sócio/Produção — ver
-- Requirement "Acesso à ficha de fatiamento".
create policy "product_slicing_sheets_select" on public.product_slicing_sheets
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketplace-vendas')
  );

create policy "product_slicing_sheets_insert" on public.product_slicing_sheets
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_slicing_sheets_update" on public.product_slicing_sheets
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_slicing_sheets_delete" on public.product_slicing_sheets
  for delete using (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_slicing_sheet_materials_select" on public.product_slicing_sheet_materials
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketplace-vendas')
  );

create policy "product_slicing_sheet_materials_insert" on public.product_slicing_sheet_materials
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_slicing_sheet_materials_delete" on public.product_slicing_sheet_materials
  for delete using (public.is_socio_or_owner() or public.has_role('producao'));

-- print_queue_item_materials: mesma regra de leitura/escrita de
-- print_queue_items (o pai), sem policy de update — snapshot imutável,
-- só criado no play e removido em cascata se o item for removido.
create policy "print_queue_item_materials_select" on public.print_queue_item_materials
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "print_queue_item_materials_insert" on public.print_queue_item_materials
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));
