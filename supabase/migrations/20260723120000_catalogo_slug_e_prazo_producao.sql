-- Campos que a loja própria (site) precisa no cadastro de peça:
-- slug (URL amigável, único) e prazo de produção estimado como faixa de dias.
--
-- O canal 'loja_propria' já existe no check de product_channel_listings.channel
-- desde 20260722120000_pedidos_loja_e_canal_site.sql — esta migration não mexe
-- nele. Publicar = listagem 'loja_propria' com is_active = true; a regra de
-- prontidão (status ativo + slug + capa + preço) vive no service, não em
-- trigger (ver design.md decisão 5).

-- =============================================================================
-- 1. Colunas novas (slug ainda nullable, para o backfill abaixo)
-- =============================================================================

alter table public.products
  add column slug text,
  add column production_lead_days_min int,
  add column production_lead_days_max int;

alter table public.products
  add constraint products_production_lead_days_check check (
    (production_lead_days_min is null or production_lead_days_min >= 0)
    and (production_lead_days_max is null or production_lead_days_max >= 0)
    and (
      production_lead_days_min is null
      or production_lead_days_max is null
      or production_lead_days_max >= production_lead_days_min
    )
  );

comment on column public.products.production_lead_days_min is
  'Prazo de produção estimado (mínimo, em dias). Nulo => a loja exibe só "feito sob encomenda", sem faixa.';
comment on column public.products.production_lead_days_max is
  'Prazo de produção estimado (máximo, em dias). Quando ambos existem, max >= min.';

-- =============================================================================
-- 2. Backfill do slug a partir do nome
--    Função temporária: a geração de slug em produção é da aplicação (ver
--    catalog-service). Ela existe só para este backfill e cai no fim.
-- =============================================================================

create function public.slugify_for_backfill(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    nullif(
      trim(both '-' from
        regexp_replace(
          lower(
            translate(
              value,
              'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
              'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        )
      ),
      ''
    ),
    'peca'
  );
$$;

-- Desambiguação por sufixo numérico: dentro de cada grupo de peças que geram
-- o mesmo slug base, a mais antiga fica com o slug limpo e as demais recebem
-- -2, -3, ... (ordem por created_at, id para ser determinístico).
with slugged as (
  select
    id,
    public.slugify_for_backfill(name) as base,
    row_number() over (
      partition by public.slugify_for_backfill(name)
      order by created_at, id
    ) as position
  from public.products
)
update public.products as p
set slug = case when s.position = 1 then s.base else s.base || '-' || s.position end
from slugged as s
where p.id = s.id;

drop function public.slugify_for_backfill(text);

-- =============================================================================
-- 3. slug passa a ser obrigatório, único e no formato de URL
-- =============================================================================

alter table public.products
  alter column slug set not null;

alter table public.products
  add constraint products_slug_format_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index products_slug_key on public.products (slug);

comment on column public.products.slug is
  'Identificador da peça na URL da loja do site (camu.com.br/loja/<slug>). Único e estável: trocar depois quebra links já publicados — a UI avisa antes de confirmar.';
