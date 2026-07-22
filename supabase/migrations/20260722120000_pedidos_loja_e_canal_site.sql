-- Pedidos da loja do site (fluxo de compra B2C) + canal de venda "loja própria".
--
-- A landing page (repo camu-web-landing-page) é quem alimenta estas tabelas:
-- insere pedidos e leads via service role (que ignora RLS). O ERP passa a ser
-- dono e gestor desses pedidos — financeiro acompanha pagamento, produção
-- acompanha a fila. Integração futura com print_queue fica para outra migration.
--
-- Preço do site = listed_price do canal 'loja_propria' em product_channel_listings
-- (mesmo modelo já usado para os marketplaces).

-- =============================================================================
-- 1. Canal 'loja_propria' em product_channel_listings
-- =============================================================================

alter table public.product_channel_listings
  drop constraint if exists product_channel_listings_channel_check;

alter table public.product_channel_listings
  add constraint product_channel_listings_channel_check
  check (channel in ('mercado_livre', 'shopee', 'tiktok_shop', 'amazon', 'shein', 'loja_propria'));

comment on constraint product_channel_listings_channel_check on public.product_channel_listings is
  'loja_propria = venda direta no site (camu.com.br). Um produto só aparece na loja do site se tiver um listing loja_propria com is_active = true; o preço da loja é o listed_price desse canal.';

-- =============================================================================
-- 2. Sequência de código de pedido amigável (CM-4821, CM-4822, ...)
-- =============================================================================

create sequence if not exists public.store_order_code_seq start 4821;

-- =============================================================================
-- 3. orders — pedido da loja do site
-- =============================================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique
    default ('CM-' || lpad(nextval('public.store_order_code_seq')::text, 4, '0')),
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'in_production', 'finishing', 'shipped', 'delivered', 'cancelled')
  ),
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  address_cep     text,
  address_line    text,
  address_city    text,
  address_uf      text,
  payment_method  text,
  payment_status  text not null default 'pending',
  subtotal_cents  integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents  integer not null default 0 check (shipping_cents >= 0),
  total_cents     integer not null default 0 check (total_cents >= 0),
  mp_preference_id text,
  mp_payment_id    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orders is
  'Pedidos da loja do site (B2C). Inseridos pela landing page via service role; gerenciados no ERP por financeiro/produção. Valores monetários em centavos. status é o eixo logístico; payment_status espelha o Mercado Pago.';

create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

-- =============================================================================
-- 4. order_items — itens do pedido (snapshot de nome/preço)
-- =============================================================================

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  variant text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now()
);

comment on table public.order_items is
  'product_name e unit_price_cents são snapshot no momento da compra — o pedido não muda se a peça for renomeada/reprecificada depois. product_id vira null se a peça for removida do catálogo (on delete set null), preservando o histórico.';

create index order_items_order_id_idx on public.order_items (order_id);

-- =============================================================================
-- 5. order_events — timeline de acompanhamento
-- =============================================================================

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index order_events_order_id_created_at_idx on public.order_events (order_id, created_at);

-- =============================================================================
-- 6. custom_orders — leads de encomenda personalizada (terminam no WhatsApp)
-- =============================================================================

create table public.custom_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  description text not null,
  budget_range text,
  reference_image_url text,
  created_at timestamptz not null default now()
);

comment on table public.custom_orders is
  'Leads de encomenda personalizada (sob medida) vindos do site. O fluxo fecha na conversa do WhatsApp; aqui fica o registro pra marketing/vendas acompanharem.';

-- =============================================================================
-- 7. updated_at automático em orders
-- =============================================================================

create function public.set_order_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_order_updated_at();

-- =============================================================================
-- 8. Row Level Security
--    A landing page escreve via service_role (ignora RLS). As policies abaixo
--    governam o acesso do time (usuários autenticados) dentro do ERP.
-- =============================================================================

alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.order_events  enable row level security;
alter table public.custom_orders enable row level security;

grant select, insert, update, delete on public.orders        to authenticated, service_role;
grant select, insert, update, delete on public.order_items   to authenticated, service_role;
grant select, insert, update, delete on public.order_events  to authenticated, service_role;
grant select, insert, update, delete on public.custom_orders to authenticated, service_role;

-- orders: leitura e gestão para Owner/Sócio, Financeiro (pagamento) e Produção (fila).
create policy "orders_select" on public.orders
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );
create policy "orders_insert" on public.orders
  for insert with check (public.is_socio_or_owner());
create policy "orders_update" on public.orders
  for update using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );
create policy "orders_delete" on public.orders
  for delete using (public.is_socio_or_owner());

-- order_items: mesma leitura; escrita para Owner/Sócio/Produção/Financeiro.
create policy "order_items_select" on public.order_items
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );
create policy "order_items_write" on public.order_items
  for all using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

-- order_events: mesma leitura; produção/financeiro/owner registram andamento.
create policy "order_events_select" on public.order_events
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );
create policy "order_events_write" on public.order_events
  for all using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

-- custom_orders: leads são coisa de marketing/vendas (e Owner/Sócio).
create policy "custom_orders_select" on public.custom_orders
  for select using (
    public.is_socio_or_owner() or public.has_role('marketing') or public.has_role('marketplace-vendas')
  );
create policy "custom_orders_delete" on public.custom_orders
  for delete using (public.is_socio_or_owner());
