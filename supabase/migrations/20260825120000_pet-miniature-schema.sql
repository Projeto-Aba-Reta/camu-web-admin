-- Fluxo "miniatura do seu pet": o cliente manda fotos no site, a IA gera uma
-- prévia da miniatura, o cliente aprova e só então paga (reaproveitando o
-- checkout de orders/order_items). Ver openspec/changes/pet-miniatura-ia-flow.
--
-- A landing page (repo camu-web-landing-page) alimenta pet_miniature_requests
-- via service role (ignora RLS); o ERP é dono e gestor — produção acompanha a
-- geração e a fila, vendas acompanha o lead. Segue o padrão de
-- 20260722120000_pedidos_loja_e_canal_site.sql.
--
-- Preço nunca hardcoded no site: vem dos listings 'loja_propria' dos dois
-- produtos criados na seção 2 (mesmo modelo dos outros canais). A IA gera
-- SEMPRE as duas prévias (pintada e sem pintura) e o cliente escolhe qual
-- comprar só na hora de aprovar.

-- =============================================================================
-- 1. pet_miniature_requests — encomenda de miniatura de pet
-- =============================================================================

create table if not exists public.pet_miniature_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  photo_paths text[] not null,
  status text not null default 'processando'
    check (status in ('processando', 'pronto', 'falhou')),
  generated_image_painted_path text,
  generated_image_plain_path text,
  selected_variant text
    check (selected_variant in ('sem_pintura', 'com_pintura')),
  ai_error text,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pet_miniature_requests is
  'Encomendas de miniatura de pet vindas do site. photo_paths aponta pro bucket privado pet-photos; generated_image_painted_path/generated_image_plain_path pro bucket público pet-media (a IA gera as duas versões de uma vez). selected_variant fica null até o cliente escolher qual comprar na aprovação. order_id fica null até o checkout gerar o pedido (on delete set null preserva o histórico da encomenda).';

create index if not exists pet_miniature_requests_order_id_idx
  on public.pet_miniature_requests (order_id);
create index if not exists pet_miniature_requests_status_idx
  on public.pet_miniature_requests (status);
create index if not exists pet_miniature_requests_created_at_idx
  on public.pet_miniature_requests (created_at desc);

-- updated_at automático (mesmo padrão de orders / sales config)
create function public.set_pet_miniature_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pet_miniature_requests_set_updated_at
  before update on public.pet_miniature_requests
  for each row execute function public.set_pet_miniature_updated_at();

-- =============================================================================
-- 2. Produtos de catálogo pra reaproveitar o checkout existente — uma linha
--    por variante (sem pintura / com pintura), cada uma com seu próprio
--    listing 'loja_propria' e preço. Preço não fica hardcoded no site.
-- =============================================================================

with sem_pintura as (
  insert into public.products (name, slug, description, category, status)
  values (
    'Miniatura Pet Personalizada - Sem Pintura',
    'miniatura-pet-personalizada-sem-pintura',
    'Miniatura impressa em 3D gerada a partir de fotos do seu pet, em cor sólida (sem pintura), aprovada por você antes do pagamento.',
    'personalizado',
    'ativo'
  )
  on conflict (slug) do update set name = excluded.name
  returning id
), com_pintura as (
  insert into public.products (name, slug, description, category, status)
  values (
    'Miniatura Pet Personalizada - Com Pintura',
    'miniatura-pet-personalizada-com-pintura',
    'Miniatura impressa em 3D gerada a partir de fotos do seu pet, pintada nas cores reais do pet, aprovada por você antes do pagamento.',
    'personalizado',
    'ativo'
  )
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into public.product_channel_listings (product_id, channel, listed_price, is_active)
select id, 'loja_propria', 60.00, true from sem_pintura
union all
select id, 'loja_propria', 75.00, true from com_pintura
on conflict (product_id, channel) do update set listed_price = excluded.listed_price;

-- =============================================================================
-- 3. Buckets de Storage
--    Sem `comment on`: a migration roda como `postgres`, que não é dono de
--    storage.buckets (owner: supabase_storage_admin).
-- =============================================================================

-- Fotos originais do cliente: privado. Só service role (landing page) e o time
-- de produção/sócios leem.
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false)
on conflict (id) do nothing;

-- Prévia gerada pela IA: pública, mesmo padrão do bucket product-media.
insert into storage.buckets (id, name, public)
values ('pet-media', 'pet-media', true)
on conflict (id) do nothing;

-- =============================================================================
-- 4. Row Level Security
--    Landing page escreve via service_role (ignora RLS). As policies governam o
--    acesso do time dentro do ERP: produção toca a fila, vendas acompanha o lead.
-- =============================================================================

alter table public.pet_miniature_requests enable row level security;

grant select, insert, update, delete on public.pet_miniature_requests to authenticated, service_role;

create policy "pet_miniature_requests_select" on public.pet_miniature_requests
  for select using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('vendas')
  );

create policy "pet_miniature_requests_write" on public.pet_miniature_requests
  for all using (
    public.is_socio_or_owner() or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner() or public.has_role('producao')
  );

-- pet-photos (privado): leitura e escrita para produção/sócios no ERP.
create policy "pet_photos_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pet-photos'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

create policy "pet_photos_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pet-photos'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

create policy "pet_photos_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pet-photos'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

-- pet-media (público): leitura dispensa policy (bucket public=true); escrita
-- restrita a produção/sócios.
create policy "pet_media_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pet-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

create policy "pet_media_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pet-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  )
  with check (
    bucket_id = 'pet-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

create policy "pet_media_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pet-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );
