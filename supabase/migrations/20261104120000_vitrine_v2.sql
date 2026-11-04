-- Vitrine V2: catálogo da loja própria, separado das peças de produção.
-- Ver docs/catalogo-v2-plano.md.
--
-- A miniatura de pet NÃO usa estas tabelas: continua em `products` +
-- `product_channel_listings` (canal loja_propria) + `order_items.product_id`.

-- =============================================================================
-- 0. Quem edita a vitrine: Owner/Sócio, produção, marketing ou site
-- =============================================================================

create function public.can_edit_storefront()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('marketing')
    or public.has_role('site');
$$;

-- =============================================================================
-- 1. store_products
-- =============================================================================

create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (btrim(title) <> ''),
  short_description text,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'arquivado')),
  category text,
  badges text[] not null default '{}',
  highlights text[] not null default '{}',
  fulfillment text not null default 'sob_encomenda' check (fulfillment in ('sob_encomenda', 'pronta_entrega')),
  lead_days_min integer check (lead_days_min is null or lead_days_min >= 0),
  lead_days_max integer check (lead_days_max is null or lead_days_max >= 0),
  featured_rank integer,
  seo_title text,
  seo_description text,
  production_product_id uuid references public.products (id) on delete set null,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lead_days_min is null or lead_days_max is null or lead_days_max >= lead_days_min)
);

comment on table public.store_products is
  'Produto de vitrine da loja própria. production_product_id é vínculo opcional com a peça de produção (custo/fatiamento). Miniatura de pet não vive aqui.';

create index store_products_status_idx on public.store_products (status);

create function public.set_store_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger store_products_set_updated_at
  before update on public.store_products
  for each row execute function public.set_store_updated_at();

-- =============================================================================
-- 2. store_product_media (capa = menor position)
-- =============================================================================

create table public.store_product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index store_product_media_product_idx on public.store_product_media (product_id, position);

-- =============================================================================
-- 3. store_variants
-- =============================================================================

create table public.store_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  price_delta_cents integer not null default 0,
  sku text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index store_variants_product_idx on public.store_variants (product_id, position);

-- =============================================================================
-- 4. order_items: referência aos produtos da vitrine
--    (product_id continua sendo usado pela miniatura de pet e pelo histórico)
-- =============================================================================

alter table public.order_items
  add column store_product_id uuid references public.store_products (id) on delete set null,
  add column store_variant_id uuid references public.store_variants (id) on delete set null;

-- =============================================================================
-- 5. RLS + grants
-- =============================================================================

alter table public.store_products enable row level security;
alter table public.store_product_media enable row level security;
alter table public.store_variants enable row level security;

grant select, insert, update, delete on public.store_products to authenticated, service_role;
grant select, insert, update, delete on public.store_product_media to authenticated, service_role;
grant select, insert, update, delete on public.store_variants to authenticated, service_role;

create policy "store_products_all" on public.store_products
  for all using (public.can_edit_storefront() or public.has_role('vendas'))
  with check (public.can_edit_storefront());

create policy "store_product_media_all" on public.store_product_media
  for all using (public.can_edit_storefront() or public.has_role('vendas'))
  with check (public.can_edit_storefront());

create policy "store_variants_all" on public.store_variants
  for all using (public.can_edit_storefront() or public.has_role('vendas'))
  with check (public.can_edit_storefront());

-- =============================================================================
-- 6. Storage: fotos da vitrine ficam em product-media/store/<productId>/...
-- =============================================================================

create policy "store_media_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = 'store'
    and public.can_edit_storefront()
  );

create policy "store_media_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = 'store'
    and public.can_edit_storefront()
  )
  with check (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = 'store'
    and public.can_edit_storefront()
  );

create policy "store_media_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-media'
    and (storage.foldername(name))[1] = 'store'
    and public.can_edit_storefront()
  );

-- =============================================================================
-- 7. View-contrato para a landing (só publicados; mídia e variantes em JSON)
-- =============================================================================

create view public.storefront_products_v as
select
  p.id,
  p.slug,
  p.title,
  p.short_description,
  p.description,
  p.price_cents,
  p.compare_at_price_cents,
  p.category,
  p.badges,
  p.highlights,
  p.fulfillment,
  p.lead_days_min,
  p.lead_days_max,
  p.featured_rank,
  p.seo_title,
  p.seo_description,
  p.published_at,
  p.created_at,
  coalesce(
    (select jsonb_agg(jsonb_build_object('path', m.storage_path, 'alt', m.alt_text) order by m.position, m.created_at)
       from public.store_product_media m where m.product_id = p.id),
    '[]'::jsonb
  ) as media,
  coalesce(
    (select jsonb_agg(jsonb_build_object('id', v.id, 'label', v.label, 'price_delta_cents', v.price_delta_cents)
                      order by v.position, v.created_at)
       from public.store_variants v where v.product_id = p.id and v.active),
    '[]'::jsonb
  ) as variants
from public.store_products p
where p.status = 'publicado';

-- A landing lê por service_role; a view não é exposta a anon/authenticated.
revoke all on public.storefront_products_v from anon, authenticated;
grant select on public.storefront_products_v to service_role;
