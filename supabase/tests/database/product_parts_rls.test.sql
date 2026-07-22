-- RLS de product_parts — ver Requirement "Leitura ampla por Produção,
-- Financeiro e Marketing; escrita restrita a Produção" em
-- openspec/changes/precificacao-de-pecas-em-partes/specs/partes-de-peca-composta/spec.md
--
-- Rodar com: npx supabase test db
--
-- Cada ator é simulado trocando o papel do Postgres para `authenticated` e
-- definindo request.jwt.claims.sub — é assim que auth.uid() resolve dentro das
-- policies. O setup roda como postgres (bypassa RLS) para montar as fixtures.

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- =============================================================================
-- Fixtures: um ator por papel + uma peça composta com uma parte
-- =============================================================================

-- Papéis usados pelas policies (a tabela roles é um catálogo dinâmico, sem
-- seed em migration — ver fundacao-schema-auth).
insert into public.roles (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000a1', 'Produção', 'producao'),
  ('00000000-0000-0000-0000-0000000000a2', 'Financeiro', 'financeiro'),
  ('00000000-0000-0000-0000-0000000000a3', 'Marketing', 'marketing');

-- profiles é criado pelo trigger on_auth_user_created a partir de auth.users.
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'producao@camu.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b2', 'authenticated', 'authenticated', 'financeiro@camu.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b3', 'authenticated', 'authenticated', 'marketing@camu.test', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b4', 'authenticated', 'authenticated', 'estranho@camu.test', now(), now());

insert into public.user_roles (user_id, role_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3');

insert into public.printers (id, name, model, depreciation_per_hour)
values ('00000000-0000-0000-0000-0000000000c1', 'Ender 3', 'Ender 3 V2', 0.8);

insert into public.products (id, name, category, product_type, status)
values ('00000000-0000-0000-0000-0000000000d1', 'Caixa Mandala', 'utilitario', 'composta', 'ativo');

insert into public.product_parts (id, product_id, name, quantity, piece_grams, printer_id, print_hours)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Decágono', 1, 40, '00000000-0000-0000-0000-0000000000c1', 3);

-- =============================================================================
-- A tabela está protegida
-- =============================================================================

select ok(
  (select relrowsecurity from pg_class where oid = 'public.product_parts'::regclass),
  'RLS está habilitada em product_parts'
);

-- =============================================================================
-- Produção: lê e escreve
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select count(*)::int from public.product_parts),
  1,
  'producao lê as partes'
);

select lives_ok(
  $$insert into public.product_parts (product_id, name, quantity, piece_grams, printer_id, print_hours)
    values ('00000000-0000-0000-0000-0000000000d1', 'Cunha', 10, 8, '00000000-0000-0000-0000-0000000000c1', 0.5)$$,
  'producao insere parte'
);

select lives_ok(
  $$update public.product_parts set quantity = 2 where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'producao edita parte'
);

select lives_ok(
  $$delete from public.product_parts where name = 'Cunha'$$,
  'producao remove parte'
);

reset role;

-- =============================================================================
-- Financeiro: lê, não escreve
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(
  (select count(*)::int from public.product_parts),
  1,
  'financeiro lê as partes'
);

select throws_ok(
  $$insert into public.product_parts (product_id, name, quantity, piece_grams, printer_id, print_hours)
    values ('00000000-0000-0000-0000-0000000000d1', 'Proibida', 1, 5, '00000000-0000-0000-0000-0000000000c1', 1)$$,
  '42501',
  null,
  'financeiro não insere parte'
);

reset role;

-- =============================================================================
-- Marketing: lê, não escreve
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';

select is(
  (select count(*)::int from public.product_parts),
  1,
  'marketing lê as partes'
);

select throws_ok(
  $$insert into public.product_parts (product_id, name, quantity, piece_grams, printer_id, print_hours)
    values ('00000000-0000-0000-0000-0000000000d1', 'Proibida', 1, 5, '00000000-0000-0000-0000-0000000000c1', 1)$$,
  '42501',
  null,
  'marketing não insere parte'
);

-- UPDATE/DELETE sem policy não erram: a linha simplesmente não é visível para
-- a escrita, então 0 linhas são afetadas e a parte permanece intacta.
select lives_ok(
  $$update public.product_parts set quantity = 99 where id = '00000000-0000-0000-0000-0000000000e1'$$,
  'update de marketing não erra (mas também não afeta linha alguma)'
);

reset role;

select is(
  (select quantity from public.product_parts where id = '00000000-0000-0000-0000-0000000000e1'),
  2,
  'a parte continua com a quantidade gravada por producao — marketing não escreveu'
);

-- =============================================================================
-- Usuário sem papel algum: não lê
-- =============================================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';

select is(
  (select count(*)::int from public.product_parts),
  0,
  'usuário sem papel não lê parte alguma'
);

reset role;

select * from finish();

rollback;
