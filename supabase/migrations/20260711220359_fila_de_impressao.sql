-- Fila de impressão: itens de produção vinculados ao catálogo, com ciclo de
-- vida na_fila/imprimindo/concluido/cancelado e atribuição de impressora do
-- parque no início da impressão.
-- Ver openspec/changes/fila-de-impressao/design.md para o racional das
-- decisões.

-- =============================================================================
-- 1. print_queue_items — itens da fila de impressão
-- =============================================================================

create table public.print_queue_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  material_id uuid not null references public.materials (id),
  quantity numeric not null check (quantity > 0),
  status text not null default 'na_fila' check (
    status in ('na_fila', 'imprimindo', 'concluido', 'cancelado')
  ),
  printer_id uuid references public.printers (id),
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.print_queue_items is
  'Ciclo de vida do item mutado in-place via UPDATE (mesmo padrão de printers.is_active), não um log append-only — ver design.md decisão "Fila única, sem impressora fixa por item".';
comment on column public.print_queue_items.printer_id is
  'Preenchido apenas ao iniciar ("play"), quando o item transiciona para imprimindo. Nulo em na_fila, concluido e cancelado que nunca chegou a iniciar.';
comment on column public.print_queue_items.started_at is
  'Preenchido no play (transição para imprimindo).';
comment on column public.print_queue_items.finished_at is
  'Preenchido ao concluir (transição para concluido). Duração da notificação Slack = finished_at - started_at.';

create index print_queue_items_status_idx on public.print_queue_items (status);

-- "Ociosa" (impressora ativa sem item imprimindo) é derivado em tempo de
-- leitura pelo service, não persistido — ver design.md decisão "'Ociosa' é
-- estado derivado, não persistido". Este índice só garante a exclusividade:
-- uma impressora nunca tem dois itens em imprimindo ao mesmo tempo.
create unique index print_queue_items_printer_imprimindo_idx
  on public.print_queue_items (printer_id)
  where status = 'imprimindo';

-- =============================================================================
-- 2. Row Level Security
-- =============================================================================

alter table public.print_queue_items enable row level security;

grant select, insert, update, delete on public.print_queue_items to authenticated, service_role;

-- Leitura: Owner/Sócio/Produção/Financeiro (mesma regra de estoque e parque
-- de impressoras). Escrita (adicionar, iniciar, concluir, cancelar): Owner/
-- Sócio/Produção — ver Requirement "Acesso à fila de impressão".
create policy "print_queue_items_select" on public.print_queue_items
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('financeiro')
  );

create policy "print_queue_items_insert" on public.print_queue_items
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "print_queue_items_update" on public.print_queue_items
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));
