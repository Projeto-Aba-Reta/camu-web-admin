-- RLS da área de Vendas — ver as Requirements "Acesso a ..." em
-- openspec/changes/tela-de-vendas-e-funil-de-pedidos/specs/*/spec.md e a
-- matriz consolidada em design.md, decisão 8.
--
-- Rodar com: npx supabase test db
--
-- Cada ator é simulado trocando o papel do Postgres para `authenticated` e
-- definindo request.jwt.claims.sub — é assim que auth.uid() resolve dentro das
-- policies. O setup roda como postgres (bypassa RLS) para montar as fixtures.
--
-- O ponto sensível aqui é a view sales_monthly_results: com
-- security_invoker = true ela herda a RLS das tabelas base, e produção lê
-- ambas. O que a mantém fora do alcance de produção é o predicado de papel
-- dentro do próprio `where` da view — se alguém removê-lo, os dois últimos
-- testes falham.

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- =============================================================================
-- Fixtures: um ator por papel + um pedido com item e custo
-- =============================================================================

insert into public.roles (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000a1', 'Vendas/Marketplace', 'vendas'),
  ('00000000-0000-0000-0000-0000000000a2', 'Produção', 'producao'),
  ('00000000-0000-0000-0000-0000000000a3', 'Precificação', 'precificacao'),
  ('00000000-0000-0000-0000-0000000000a4', 'Marketing', 'marketing');

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'vendas@camu.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'producao@camu.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b3', 'authenticated', 'authenticated', 'precificacao@camu.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b4', 'authenticated', 'authenticated', 'marketing@camu.test', now(), now());

insert into public.user_roles (user_id, role_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4');

-- Etapas e origens vêm semeadas pela própria migration; o pedido abaixo cai
-- na etapa inicial pelo trigger orders_set_initial_stage.
insert into public.orders (id, customer_name, subtotal_cents, total_cents, sale_origin_id)
values (
  '00000000-0000-0000-0000-0000000000d1',
  'Ana',
  4000,
  4000,
  (select id from public.sale_origins where slug = 'boca_a_boca')
);

insert into public.order_items (order_id, product_name, unit_price_cents, qty)
values ('00000000-0000-0000-0000-0000000000d1', 'Leon Sentado', 4000, 1);

insert into public.order_costs (order_id, amount_cents, category)
values ('00000000-0000-0000-0000-0000000000d1', 1450, 'filamento');

-- =============================================================================
-- As tabelas estão protegidas
-- =============================================================================

select ok(
  (select relrowsecurity from pg_class where oid = 'public.order_costs'::regclass),
  'RLS está habilitada em order_costs'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.order_pipeline_stages'::regclass),
  'RLS está habilitada em order_pipeline_stages'
);

-- O trigger de etapa inicial é o que deixa a landing page inserir sem
-- conhecer o funil.
select is(
  (select s.slug from public.orders o join public.order_pipeline_stages s on s.id = o.pipeline_stage_id
   where o.id = '00000000-0000-0000-0000-0000000000d1'),
  'pensando_modelagem',
  'pedido inserido sem etapa nasce na etapa inicial'
);

-- =============================================================================
-- Vendas: lê e escreve pedido, configura etapas, vê o resultado
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select count(*)::int from public.orders),
  1,
  'vendas lê os pedidos'
);

select lives_ok(
  $$insert into public.orders (customer_name, subtotal_cents, total_cents) values ('Bruno', 5000, 5000)$$,
  'vendas cadastra pedido'
);

select lives_ok(
  $$update public.orders set customer_name = 'Ana Paula' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  'vendas edita pedido'
);

select lives_ok(
  $$insert into public.order_pipeline_stages (slug, name, sort_order) values ('revisao', 'Aguardando revisão', 99)$$,
  'vendas cria etapa do funil'
);

select isnt_empty(
  $$select * from public.sales_monthly_results$$,
  'vendas vê o resultado agregado'
);

reset role;

-- =============================================================================
-- Produção: move pedido e lança custo, mas não vê o resultado do mês
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(
  (select count(*)::int from public.orders where id = '00000000-0000-0000-0000-0000000000d1'),
  1,
  'producao lê o pedido'
);

select lives_ok(
  $$insert into public.order_costs (order_id, amount_cents, category)
    values ('00000000-0000-0000-0000-0000000000d1', 320, 'embalagem')$$,
  'producao lança custo'
);

select is(
  (select count(*)::int from public.order_costs where order_id = '00000000-0000-0000-0000-0000000000d1'),
  2,
  'producao confere os custos que lançou'
);

select throws_ok(
  $$insert into public.order_pipeline_stages (slug, name, sort_order) values ('proibida', 'Proibida', 98)$$,
  '42501',
  null,
  'producao não configura etapas do funil'
);

select is_empty(
  $$select * from public.sales_monthly_results$$,
  'producao não vê o resultado agregado do mês'
);

reset role;

-- =============================================================================
-- Precificação: lê pedido, custo e resultado; não cadastra venda
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';

select isnt_empty(
  $$select * from public.sales_monthly_results$$,
  'precificacao vê o resultado agregado'
);

select throws_ok(
  $$insert into public.orders (customer_name, subtotal_cents, total_cents) values ('Carlos', 1000, 1000)$$,
  '42501',
  null,
  'precificacao não cadastra pedido'
);

reset role;

-- =============================================================================
-- Marketing: só enxerga as origens de venda
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';

select is_empty(
  $$select * from public.orders$$,
  'marketing não lê pedidos'
);

select is_empty(
  $$select * from public.order_costs$$,
  'marketing não lê custos'
);

select isnt_empty(
  $$select * from public.sale_origins$$,
  'marketing lê as origens de venda'
);

reset role;

select * from finish();

rollback;
