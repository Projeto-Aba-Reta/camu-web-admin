-- Área de Vendas: funil de pedidos com etapas cadastráveis, origem da venda,
-- custo real por pedido e as views de resultado (receita x gasto x lucro).
--
-- Ver openspec/changes/tela-de-vendas-e-funil-de-pedidos/design.md.
--
-- Premissa central (design.md, decisões 1 e 2): NÃO criamos uma tabela de
-- vendas paralela. `orders` já é o pedido — só que hoje só a landing page
-- escreve nela. As colunas novas são todas nuláveis e o insert que a landing
-- page faz continua válido sem uma linha de mudança do lado dela.
--
-- `orders.status` (pending..delivered) é contrato com a landing page e com o
-- webhook do Mercado Pago; ele NÃO vira FK para as etapas cadastráveis. Os
-- dois eixos passam a conviver e evoluem independentemente.

-- =============================================================================
-- 1. sale_origins — como a Camu conseguiu a venda
-- =============================================================================

create table public.sale_origins (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  -- Origem que só faz sentido com um responsável nomeado: "boca-a-boca" e
  -- "indicação" respondem a "quem vendeu?". Marketplace não tem vendedor.
  requires_seller boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sale_origins is
  'Catálogo editável de origens de venda. Arquiva-se (is_active = false), não se exclui: a origem precisa sobreviver nos pedidos que já a usam e nos recortes do resultado.';

create index sale_origins_active_sort_idx on public.sale_origins (is_active, sort_order);

-- =============================================================================
-- 2. order_pipeline_stages — as colunas do kanban
-- =============================================================================

create table public.order_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  color text not null default 'slate',
  is_active boolean not null default true,
  is_initial boolean not null default false,
  is_final boolean not null default false,
  -- Etapa que pergunta "em qual impressora?" ao receber um pedido.
  requires_printer boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.order_pipeline_stages is
  'Colunas do funil de pedidos, editáveis pelo time. As sete etapas semente são criadas nesta migration porque o funil não pode existir sem etapa inicial — o trigger de insert de orders depende dela.';

-- Índices únicos parciais: entre as etapas ATIVAS existe no máximo uma
-- inicial e no máximo uma final. `where is_initial and is_active` deixa o
-- índice com uma só chave possível (true), então a segunda linha colide.
create unique index order_pipeline_stages_single_initial_idx
  on public.order_pipeline_stages (is_initial)
  where is_initial and is_active;

create unique index order_pipeline_stages_single_final_idx
  on public.order_pipeline_stages (is_final)
  where is_final and is_active;

-- sort_order NÃO tem índice único de propósito: a reordenação reescreve
-- várias linhas de uma vez e um índice único não-postergável colidiria no
-- meio do UPDATE. A distinção das posições é normalizada em transação pelo
-- SalesPipelineService.
create index order_pipeline_stages_active_sort_idx
  on public.order_pipeline_stages (is_active, sort_order);

-- =============================================================================
-- 3. Seed das etapas e das origens
-- =============================================================================

insert into public.order_pipeline_stages
  (slug, name, sort_order, color, is_initial, is_final, requires_printer)
values
  ('pensando_modelagem',   'Pensando na modelagem', 1, 'violet', true,  false, false),
  ('aguardando_impressao', 'Aguardando impressão',  2, 'amber',  false, false, false),
  ('imprimindo',           'Imprimindo',            3, 'blue',   false, false, true),
  ('aguardando_embalagem', 'Aguardando embalagem',  4, 'amber',  false, false, false),
  ('embalando',            'Embalando',             5, 'cyan',   false, false, false),
  ('aguardando_envio',     'Aguardando envio',      6, 'amber',  false, false, false),
  ('enviado',              'Enviado',               7, 'emerald', false, true,  false)
on conflict (slug) do nothing;

insert into public.sale_origins (slug, name, sort_order, requires_seller)
values
  ('boca_a_boca',   'Boca-a-boca',   1, true),
  ('indicacao',     'Indicação',     2, true),
  ('feira_evento',  'Feira/evento',  3, false),
  ('loja_propria',  'Loja própria',  4, false),
  ('mercado_livre', 'Mercado Livre', 5, false),
  ('shopee',        'Shopee',        6, false),
  ('tiktok_shop',   'TikTok Shop',   7, false),
  ('amazon',        'Amazon',        8, false),
  ('shein',         'SHEIN',         9, false)
on conflict (slug) do nothing;

-- =============================================================================
-- 4. Colunas novas em orders
-- =============================================================================

alter table public.orders
  add column sale_origin_id    uuid references public.sale_origins (id) on delete restrict,
  add column sold_by_profile_id uuid references public.profiles (id) on delete set null,
  add column pipeline_stage_id  uuid references public.order_pipeline_stages (id) on delete restrict,
  add column current_printer_id uuid references public.printers (id) on delete set null;

comment on column public.orders.status is
  'Eixo logístico/pagamento da LOJA DO SITE (contrato com a landing page e o webhook do Mercado Pago). NÃO é o funil da área de Vendas — esse é pipeline_stage_id. Os dois são independentes de propósito e nada os sincroniza; a única leitura cruzada é cancelled, que exclui o pedido do resultado de vendas.';

comment on column public.orders.pipeline_stage_id is
  'Etapa cadastrável do funil de vendas. Nulo no insert é preenchido com a etapa is_initial pelo trigger orders_set_initial_stage — é o que deixa a landing page inserir sem conhecer o funil.';

comment on column public.orders.sale_origin_id is
  'Como a venda foi conseguida. Nulo em pedidos criados pela loja do site, que a tela exibe como "Loja própria" sem gravar.';

comment on column public.orders.sold_by_profile_id is
  'Quem vendeu. Obrigatório quando sale_origins.requires_seller — validado no SalesService, não no banco, porque a regra depende de uma linha de outra tabela que o time pode alternar a qualquer momento.';

comment on column public.orders.current_printer_id is
  'Impressora onde o pedido está AGORA. Preenchido ao entrar em etapa requires_printer e limpo ao sair; o histórico de por quais impressoras passou fica em order_stage_events.';

create index orders_pipeline_stage_id_idx on public.orders (pipeline_stage_id);
create index orders_sale_origin_id_idx on public.orders (sale_origin_id);

-- =============================================================================
-- 5. Backfill: status atual -> etapa do funil (uma vez só)
-- =============================================================================
-- Depois deste update os dois campos seguem caminhos separados. Isto não é
-- uma sincronização recorrente: é a posição inicial dos pedidos que já
-- existiam quando o funil nasceu.

update public.orders o
set pipeline_stage_id = s.id
from public.order_pipeline_stages s
where o.pipeline_stage_id is null
  and s.slug = case o.status
    when 'pending'       then 'pensando_modelagem'
    when 'paid'          then 'pensando_modelagem'
    when 'in_production' then 'aguardando_impressao'
    when 'finishing'     then 'aguardando_embalagem'
    when 'shipped'       then 'enviado'
    when 'delivered'     then 'enviado'
    when 'cancelled'     then 'pensando_modelagem'
    else 'pensando_modelagem'
  end;

-- =============================================================================
-- 6. Trigger: pedido sem etapa nasce na etapa inicial
-- =============================================================================

create function public.set_order_initial_stage()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pipeline_stage_id is null then
    select id into new.pipeline_stage_id
    from public.order_pipeline_stages
    where is_initial and is_active
    limit 1;
  end if;
  return new;
end;
$$;

create trigger orders_set_initial_stage
  before insert on public.orders
  for each row execute function public.set_order_initial_stage();

-- =============================================================================
-- 7. order_stage_events — histórico de passagem por etapa (append-only)
-- =============================================================================
-- Tabela própria, não order_events: aquela já é escrita pela landing page com
-- o vocabulário de `status`, e misturar os dois obrigaria todo leitor a
-- distinguir por convenção qual evento é de qual eixo.

create table public.order_stage_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_stage_id uuid references public.order_pipeline_stages (id) on delete set null,
  to_stage_id uuid not null references public.order_pipeline_stages (id) on delete restrict,
  printer_id uuid references public.printers (id) on delete set null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.order_stage_events is
  'Append-only: cada movimentação grava uma linha e nenhuma movimentação posterior edita as anteriores. from_stage_id nulo = primeira colocação do pedido no funil.';

create index order_stage_events_order_id_created_at_idx
  on public.order_stage_events (order_id, created_at);

-- =============================================================================
-- 8. order_costs — quanto realmente se gastou naquele pedido
-- =============================================================================
-- Lançamentos, não coluna única em orders: o custo chega em pedaços e de
-- áreas diferentes (produção sabe o filamento, vendas sabe a taxa do canal,
-- quem despacha sabe o frete). Uma coluna faria a última área a escrever
-- apagar o número das outras.

create table public.order_costs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  category text not null check (
    category in ('filamento', 'embalagem', 'frete', 'taxa_canal', 'outros')
  ),
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.order_costs is
  'Custo real incorrido por pedido. Custo do pedido = soma dos seus lançamentos; não há estorno por valor negativo (o check proíbe) — corrige-se editando ou excluindo o lançamento.';

create index order_costs_order_id_idx on public.order_costs (order_id);

-- =============================================================================
-- 9. Views de resultado
-- =============================================================================
-- security_invoker = true: a view roda com as permissões de quem consulta,
-- então herda a RLS das tabelas base em vez de contorná-la.

create view public.order_financials
with (security_invoker = true) as
select
  o.id as order_id,
  o.total_cents as revenue_cents,
  coalesce(c.cost_cents, 0)::bigint as cost_cents,
  (o.total_cents - coalesce(c.cost_cents, 0))::bigint as profit_cents,
  coalesce(c.cost_entries, 0)::bigint as cost_entries
from public.orders o
left join (
  select order_id,
         sum(amount_cents)::bigint as cost_cents,
         count(*)::bigint as cost_entries
  from public.order_costs
  group by order_id
) c on c.order_id = o.id;

comment on view public.order_financials is
  'Receita, custo somado e lucro por pedido. cost_entries = 0 é o sinal de "custo não informado", que a tela precisa distinguir de custo zero.';

create view public.sales_monthly_results
with (security_invoker = true) as
select
  date_trunc('month', o.created_at)::date as month,
  o.sale_origin_id,
  sum(o.total_cents)::bigint as revenue_cents,
  sum(coalesce(c.cost_cents, 0))::bigint as cost_cents,
  (sum(o.total_cents) - sum(coalesce(c.cost_cents, 0)))::bigint as profit_cents,
  count(*)::bigint as order_count
from public.orders o
left join (
  select order_id, sum(amount_cents)::bigint as cost_cents
  from public.order_costs
  group by order_id
) c on c.order_id = o.id
where o.status <> 'cancelled'
  -- Predicado de papel dentro da própria view: com security_invoker, quem lê
  -- orders e order_costs leria também a agregação. Produção pode lançar e
  -- conferir o custo de um pedido, mas o resultado do mês é de Vendas,
  -- Financeiro e sócios (design.md, decisão 8).
  and (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
  )
group by 1, 2;

comment on view public.sales_monthly_results is
  'Grão (mês, origem): serve tanto a série mensal do gráfico (somando as origens) quanto a quebra por origem do período (somando os meses) — são ~120 linhas por consulta, agregadas no SalesResultService. Meses sem pedido não existem aqui; a série contínua do gráfico é preenchida no serviço, porque buraco de calendário é apresentação, não dado.';

-- =============================================================================
-- 10. Row Level Security — tabelas novas
-- =============================================================================

alter table public.sale_origins          enable row level security;
alter table public.order_pipeline_stages enable row level security;
alter table public.order_stage_events    enable row level security;
alter table public.order_costs           enable row level security;

grant select, insert, update, delete on public.sale_origins          to authenticated, service_role;
grant select, insert, update, delete on public.order_pipeline_stages to authenticated, service_role;
-- Histórico é append-only: sem update/delete.
grant select, insert                  on public.order_stage_events   to authenticated, service_role;
grant select, insert, update, delete on public.order_costs           to authenticated, service_role;

grant select on public.order_financials      to authenticated, service_role;
grant select on public.sales_monthly_results to authenticated, service_role;

-- sale_origins: marketing lê (quer saber de onde vêm as vendas), só vendas escreve.
create policy "sale_origins_select" on public.sale_origins
  for select using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('marketing')
  );
create policy "sale_origins_insert" on public.sale_origins
  for insert with check (public.is_socio_or_owner() or public.has_role('vendas'));
create policy "sale_origins_update" on public.sale_origins
  for update using (public.is_socio_or_owner() or public.has_role('vendas'))
  with check (public.is_socio_or_owner() or public.has_role('vendas'));
create policy "sale_origins_delete" on public.sale_origins
  for delete using (public.is_socio_or_owner() or public.has_role('vendas'));

-- order_pipeline_stages: quem vê o quadro lê; só vendas configura.
create policy "order_pipeline_stages_select" on public.order_pipeline_stages
  for select using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('producao')
    or public.has_role('financeiro')
  );
create policy "order_pipeline_stages_insert" on public.order_pipeline_stages
  for insert with check (public.is_socio_or_owner() or public.has_role('vendas'));
create policy "order_pipeline_stages_update" on public.order_pipeline_stages
  for update using (public.is_socio_or_owner() or public.has_role('vendas'))
  with check (public.is_socio_or_owner() or public.has_role('vendas'));
create policy "order_pipeline_stages_delete" on public.order_pipeline_stages
  for delete using (public.is_socio_or_owner() or public.has_role('vendas'));

-- order_stage_events: mesma leitura do quadro; escreve quem move (vendas e produção).
create policy "order_stage_events_select" on public.order_stage_events
  for select using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('producao')
    or public.has_role('financeiro')
  );
create policy "order_stage_events_insert" on public.order_stage_events
  for insert with check (
    public.is_socio_or_owner() or public.has_role('vendas') or public.has_role('producao')
  );

-- order_costs: quem pode lançar precisa enxergar o que lançou — leitura e
-- escrita têm a mesma regra. Produção entra porque quem imprime é quem sabe
-- o consumo real de filamento.
create policy "order_costs_select" on public.order_costs
  for select using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  );
create policy "order_costs_write" on public.order_costs
  for all using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  );

-- =============================================================================
-- 11. Reescrita das policies de orders/order_items para incluir `vendas`
-- =============================================================================
-- A role `vendas` nasceu em 20260714120000 sem nenhuma policy — era reserva
-- de nome. Aqui ela ganha acesso de fato. orders_insert/update/delete, que
-- eram exclusivos de sócio/owner, passam a aceitar vendas: cadastrar venda é
-- justamente o trabalho dessa área.

drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  );

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders
  for insert with check (public.is_socio_or_owner() or public.has_role('vendas'));

drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders
  for update using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  );

drop policy if exists "orders_delete" on public.orders;
create policy "orders_delete" on public.orders
  for delete using (public.is_socio_or_owner() or public.has_role('vendas'));

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  );

drop policy if exists "order_items_write" on public.order_items;
create policy "order_items_write" on public.order_items
  for all using (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  )
  with check (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('financeiro')
    or public.has_role('producao')
  );

-- =============================================================================
-- 12. Guarda: nenhuma policy de orders/order_items pode ficar sem `vendas`
-- =============================================================================
-- Mesmo raciocínio do guard em 20260714120000: policy esquecida não quebra
-- build nem typecheck — ela só nega acesso, em silêncio, a quem tem a role.

do $$
declare
  v_faltando int;
begin
  select count(*) into v_faltando
  from pg_policies
  where schemaname = 'public'
    and tablename in ('orders', 'order_items')
    and coalesce(qual::text, '') || coalesce(with_check::text, '') not like '%vendas%';

  if v_faltando > 0 then
    raise exception
      'Existem % policies em orders/order_items que não citam has_role(''vendas''); a área de Vendas não conseguiria operar e a falha seria silenciosa.',
      v_faltando;
  end if;
end $$;

-- =============================================================================
-- 13. updated_at automático nas tabelas de configuração
-- =============================================================================

create function public.set_sales_config_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sale_origins_set_updated_at
  before update on public.sale_origins
  for each row execute function public.set_sales_config_updated_at();

create trigger order_pipeline_stages_set_updated_at
  before update on public.order_pipeline_stages
  for each row execute function public.set_sales_config_updated_at();
