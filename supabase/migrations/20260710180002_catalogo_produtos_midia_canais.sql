-- Catálogo: peças do catálogo autoral, mídia e disponibilidade por canal.
-- Ver openspec/changes/catalogo-schema/design.md para o racional das decisões.

-- =============================================================================
-- 1. products — peça do catálogo autoral
-- =============================================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null check (
    category in ('miniatura_colecionavel', 'personalizado', 'utilitario', 'linha_leon')
  ),
  size_tier text check (size_tier in ('P', 'M', 'G')),
  status text not null default 'rascunho' check (
    status in ('rascunho', 'ativo', 'inativo', 'descontinuado')
  ),
  price_calculation_id uuid references public.price_calculations (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is
  'Categoria de canal e porte são eixos independentes (ver design.md decisão 1): categoria decide canal/impressora, porte decide custo/preço. size_tier é nullable — peça pode nascer rascunho sem cálculo vinculado ainda.';
comment on column public.products.price_calculation_id is
  'Vínculo opcional: peça pode existir sem cálculo (rascunho). Ao vincular, o service de catálogo copia o porte sugerido e sugestões de preço por canal, mas ambos ficam editáveis depois (ver design.md decisão 2).';

create index products_status_idx on public.products (status);

-- =============================================================================
-- 2. product_media — fotos vinculadas a uma peça
-- =============================================================================

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.product_media is
  'storage_path é referência opaca a um arquivo já hospedado (ex. Supabase Storage) — upload/validação de existência é responsabilidade da UI (catalogo-telas), não deste schema.';

create index product_media_product_id_display_order_idx on public.product_media (product_id, display_order);

-- Garante no máximo uma capa por peça (ver design.md decisão 3). A troca de
-- capa é responsabilidade do service (desmarcar a anterior antes de marcar
-- a nova), não deste índice — o índice só impede que duas fiquem true ao
-- mesmo tempo.
create unique index product_media_one_cover_per_product_idx
  on public.product_media (product_id)
  where (is_cover = true);

-- =============================================================================
-- 3. product_channel_listings — disponibilidade e preço por canal
-- =============================================================================

create table public.product_channel_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  channel text not null check (channel in ('mercado_livre', 'shopee', 'tiktok_shop', 'amazon', 'shein')),
  listed_price numeric not null,
  is_active boolean not null default true,
  price_override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, channel)
);

comment on table public.product_channel_listings is
  'Uma peça tem no máximo uma listagem por canal (unique product_id+channel). listed_price é campo próprio, editável independentemente do preço sugerido pelo cálculo vinculado à peça (ver design.md decisão 4).';

-- Preço divergente do sugerido pelo cálculo vinculado exige motivo (ver
-- design.md decisão 2 e Risks). Precisa de trigger, não de CHECK simples,
-- porque o preço sugerido mora em outra tabela (price_calculations, via
-- products.price_calculation_id). security definer garante que a checagem
-- funcione mesmo para roles (marketplace-vendas) sem select direto em
-- price_calculations.
create function public.check_channel_listing_price_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  suggested_price numeric;
begin
  select (cp.elem ->> 'suggestedPrice')::numeric
  into suggested_price
  from public.products pr
  join public.price_calculations pc on pc.id = pr.price_calculation_id
  cross join lateral jsonb_array_elements(pc.channel_prices) as cp(elem)
  where pr.id = new.product_id
    and cp.elem ->> 'channel' = new.channel
  limit 1;

  if suggested_price is not null
     and round(new.listed_price, 2) <> round(suggested_price, 2)
     and coalesce(btrim(new.price_override_reason), '') = ''
  then
    raise exception
      'price_override_reason é obrigatório quando listed_price (%) diverge do preço sugerido pelo cálculo vinculado (%)',
      new.listed_price, suggested_price;
  end if;

  return new;
end;
$$;

create trigger product_channel_listings_check_override
  before insert or update on public.product_channel_listings
  for each row execute function public.check_channel_listing_price_override();

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.product_channel_listings enable row level security;

grant select, insert, update, delete on public.products to authenticated, service_role;
grant select, insert, update, delete on public.product_media to authenticated, service_role;
grant select, insert, update, delete on public.product_channel_listings to authenticated, service_role;

-- products / product_media: leitura ampla (Owner/Sócio/Produção/Financeiro/
-- Vendas — quem vende precisa ver o catálogo); escrita restrita a
-- Owner/Sócio/Produção (dono do catálogo autoral).
create policy "products_select" on public.products
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketplace-vendas')
  );

create policy "products_insert" on public.products
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "products_update" on public.products
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "products_delete" on public.products
  for delete using (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_media_select" on public.product_media
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketplace-vendas')
  );

create policy "product_media_insert" on public.product_media
  for insert with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_media_update" on public.product_media
  for update using (public.is_socio_or_owner() or public.has_role('producao'))
  with check (public.is_socio_or_owner() or public.has_role('producao'));

create policy "product_media_delete" on public.product_media
  for delete using (public.is_socio_or_owner() or public.has_role('producao'));

-- product_channel_listings: mesma leitura ampla; escrita (criar/atualizar/
-- desativar) também liberada a marketplace-vendas — decidir onde/por
-- quanto vender é operação de canal, não de produção.
create policy "product_channel_listings_select" on public.product_channel_listings
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketplace-vendas')
  );

create policy "product_channel_listings_insert" on public.product_channel_listings
  for insert with check (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('marketplace-vendas')
  );

create policy "product_channel_listings_update" on public.product_channel_listings
  for update using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('marketplace-vendas')
  )
  with check (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('marketplace-vendas')
  );
