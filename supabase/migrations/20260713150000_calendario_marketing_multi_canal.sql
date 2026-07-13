-- Um post de conteúdo passa a cobrir vários canais: a mesma gravação é
-- publicada em Instagram, TikTok e Kwai sem virar três itens de funil. O
-- canal deixa de ser uma coluna única em social_content_plan_items e vira
-- uma tabela de junção — um item, N canais, um único card no board que
-- avança uma vez pelo funil.

create table public.social_content_plan_item_channels (
  item_id uuid not null references public.social_content_plan_items (id) on delete cascade,
  channel text not null check (channel in ('instagram', 'tiktok', 'youtube', 'kwai', 'facebook', 'outro')),
  -- Um canal nunca se repete no mesmo item.
  primary key (item_id, channel)
);

comment on table public.social_content_plan_item_channels is
  'Canais de rede social de um item de planejamento (pelo menos um, garantido pelo SocialContentPlanService). Distintos dos canais de venda de product_channel_listings: quem publica um Reels não publica na Shopee.';

-- Preserva os itens já cadastrados: cada um vira um item de um canal só.
insert into public.social_content_plan_item_channels (item_id, channel)
select id, channel from public.social_content_plan_items;

alter table public.social_content_plan_items drop column channel;

alter table public.social_content_plan_item_channels enable row level security;

grant select, insert, update, delete on public.social_content_plan_item_channels to authenticated, service_role;

-- Mesma regra de acesso do item dono da linha (ver Requirement "Acesso ao
-- calendário de marketing").
create policy "social_content_plan_item_channels_select" on public.social_content_plan_item_channels
  for select using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_item_channels_insert" on public.social_content_plan_item_channels
  for insert with check (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));

create policy "social_content_plan_item_channels_delete" on public.social_content_plan_item_channels
  for delete using (public.is_socio_or_owner() or public.has_role('marketplace-vendas'));
