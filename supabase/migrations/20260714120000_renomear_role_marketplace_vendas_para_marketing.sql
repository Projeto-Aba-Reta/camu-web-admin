-- =============================================================================
-- Renomeia a role marketplace-vendas -> marketing e reserva a role vendas
-- =============================================================================
-- A área antes chamada "Marketplace/Vendas" só tem uma tela: o calendário de
-- marketing de redes sociais. O nome prometia um domínio (vendas por canal,
-- pré-venda por lote) que ainda não existe.
--
-- public.has_role(slug) resolve a role POR SLUG em tempo de consulta — as
-- policies literalizam a string, não o id da role. Logo, no instante em que
-- roles.slug muda, toda policy que ainda diz has_role('marketplace-vendas')
-- passa a avaliar false para todo mundo, sem erro e sem warning. Por isso o
-- update do slug e a reescrita das 19 policies (9 tabelas) estão na MESMA
-- migration: a janela de acesso negado entre as duas etapas não pode ser
-- observável por outra sessão.
--
-- O rename é um UPDATE, nunca delete+insert: user_roles.role_id referencia
-- roles.id com on delete cascade, então recriar a linha apagaria em silêncio
-- as atribuições dos sócios.
-- =============================================================================

-- 1. Rename da role, preservando o id (e portanto user_roles)
update public.roles
set name = 'Marketing',
    slug = 'marketing',
    updated_at = now()
where slug = 'marketplace-vendas';

-- =============================================================================
-- 2. Reescrita das policies — mesma expressão, só o slug muda
-- =============================================================================

-- 2.1 Catálogo (de 20260710180002_catalogo_produtos_midia_canais.sql)

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

drop policy if exists "product_media_select" on public.product_media;
create policy "product_media_select" on public.product_media
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

drop policy if exists "product_channel_listings_select" on public.product_channel_listings;
create policy "product_channel_listings_select" on public.product_channel_listings
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

drop policy if exists "product_channel_listings_insert" on public.product_channel_listings;
create policy "product_channel_listings_insert" on public.product_channel_listings
  for insert with check (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('marketing')
  );

drop policy if exists "product_channel_listings_update" on public.product_channel_listings;
create policy "product_channel_listings_update" on public.product_channel_listings
  for update using (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('marketing')
  )
  with check (
    public.is_socio_or_owner() or public.has_role('producao') or public.has_role('marketing')
  );

-- 2.2 Ficha de fatiamento (de 20260711223431_ficha_de_fatiamento.sql)

drop policy if exists "product_slicing_sheets_select" on public.product_slicing_sheets;
create policy "product_slicing_sheets_select" on public.product_slicing_sheets
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

drop policy if exists "product_slicing_sheet_materials_select" on public.product_slicing_sheet_materials;
create policy "product_slicing_sheet_materials_select" on public.product_slicing_sheet_materials
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

-- 2.3 Composição de produto (de 20260713120000_precificacao_produtos_compostos_e_b2b.sql)

drop policy if exists "product_components_select" on public.product_components;
create policy "product_components_select" on public.product_components
  for select using (
    public.is_socio_or_owner()
    or public.has_role('producao')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );

-- 2.4 Calendário de marketing (de 20260713140000_calendario_marketing_redes_sociais.sql)

drop policy if exists "commemorative_dates_marketing_select" on public.commemorative_dates_marketing;
create policy "commemorative_dates_marketing_select" on public.commemorative_dates_marketing
  for select using (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "commemorative_dates_marketing_insert" on public.commemorative_dates_marketing;
create policy "commemorative_dates_marketing_insert" on public.commemorative_dates_marketing
  for insert with check (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "commemorative_dates_marketing_update" on public.commemorative_dates_marketing;
create policy "commemorative_dates_marketing_update" on public.commemorative_dates_marketing
  for update using (public.is_socio_or_owner() or public.has_role('marketing'))
  with check (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_items_select" on public.social_content_plan_items;
create policy "social_content_plan_items_select" on public.social_content_plan_items
  for select using (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_items_insert" on public.social_content_plan_items;
create policy "social_content_plan_items_insert" on public.social_content_plan_items
  for insert with check (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_items_update" on public.social_content_plan_items;
create policy "social_content_plan_items_update" on public.social_content_plan_items
  for update using (public.is_socio_or_owner() or public.has_role('marketing'))
  with check (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_status_events_select" on public.social_content_plan_status_events;
create policy "social_content_plan_status_events_select" on public.social_content_plan_status_events
  for select using (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_status_events_insert" on public.social_content_plan_status_events;
create policy "social_content_plan_status_events_insert" on public.social_content_plan_status_events
  for insert with check (public.is_socio_or_owner() or public.has_role('marketing'));

-- 2.5 Multi-canal do calendário (de 20260713150000_calendario_marketing_multi_canal.sql)

drop policy if exists "social_content_plan_item_channels_select" on public.social_content_plan_item_channels;
create policy "social_content_plan_item_channels_select" on public.social_content_plan_item_channels
  for select using (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_item_channels_insert" on public.social_content_plan_item_channels;
create policy "social_content_plan_item_channels_insert" on public.social_content_plan_item_channels
  for insert with check (public.is_socio_or_owner() or public.has_role('marketing'));

drop policy if exists "social_content_plan_item_channels_delete" on public.social_content_plan_item_channels;
create policy "social_content_plan_item_channels_delete" on public.social_content_plan_item_channels
  for delete using (public.is_socio_or_owner() or public.has_role('marketing'));

-- =============================================================================
-- 3. Role de reserva: Vendas/Marketplace
-- =============================================================================
-- Nasce sem tela e sem policy — não concede acesso a nada. Sem entrada em
-- areaRoutes, a sidebar a renderiza como item não-clicável (navegacao-por-area).
-- Reserva o nome do domínio de vendas por canal, que será construído depois.

insert into public.roles (name, slug, created_by)
select 'Vendas/Marketplace', 'vendas', r.created_by
from public.roles r
where r.slug = 'marketing'
on conflict (slug) do nothing;

-- =============================================================================
-- 4. Guarda: nenhuma policy pode restar citando o slug antigo
-- =============================================================================
-- Uma policy esquecida não quebra build nem typecheck — ela só nega acesso, em
-- silêncio, a quem tem a role. Falhar a migration aqui é a única forma de a
-- omissão ser detectada no momento em que ela acontece.

do $$
declare
  v_residuo int;
begin
  select count(*) into v_residuo
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual::text, '') like '%marketplace-vendas%'
         or coalesce(with_check::text, '') like '%marketplace-vendas%');

  if v_residuo > 0 then
    raise exception
      'Ainda restam % policies citando has_role(''marketplace-vendas''); a role foi renomeada e elas negariam acesso em silêncio.',
      v_residuo;
  end if;
end $$;
