-- Referência do schema necessário pro fluxo "miniatura do seu pet" (change
-- openspec/changes/pet-miniatura-ia-flow). NÃO é uma migration deste repo —
-- o schema é propriedade do ERP camu-web-admin (ver supabase/README.md).
-- Aplique isto (ou a migration equivalente) lá, seguindo o padrão de
-- 20260722120000_pedidos_loja_e_canal_site.sql, e depois rode a criação dos
-- buckets de Storage abaixo direto no projeto Supabase.

-- 1. Tabela da encomenda de miniatura de pet
create table if not exists public.pet_miniature_requests (
  id uuid primary key,
  customer_name text not null,
  customer_phone text not null,
  photo_paths text[] not null,
  status text not null default 'processando'
    check (status in ('processando', 'pronto', 'falhou')),
  generated_image_path text,
  ai_error text,
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pet_miniature_requests_order_id_idx
  on public.pet_miniature_requests (order_id);

-- 2. Produto de catálogo pra reaproveitar o checkout existente (preço nunca
--    hardcoded no site — vem sempre do listing abaixo). Ajuste o preço.
insert into public.products (name, description, category, status)
values (
  'Miniatura Pet Personalizada',
  'Miniatura impressa em 3D gerada a partir de fotos do seu pet, aprovada por você antes do pagamento.',
  'personalizado',
  'ativo'
)
returning id; -- guarde esse id em PET_MINIATURE_PRODUCT_ID (.env.local)

-- insert into public.product_channel_listings (product_id, channel, listed_price, is_active)
-- values ('<id retornado acima>', 'loja_propria', 149.90, true);

-- 3. Buckets de Storage (rodar no projeto Supabase, via SQL Editor ou dashboard)
-- Fotos originais do cliente: privado, só service role lê.
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false)
on conflict (id) do nothing;

-- Prévia gerada pela IA: pública, mesmo padrão do bucket product-media.
insert into storage.buckets (id, name, public)
values ('pet-media', 'pet-media', true)
on conflict (id) do nothing;
