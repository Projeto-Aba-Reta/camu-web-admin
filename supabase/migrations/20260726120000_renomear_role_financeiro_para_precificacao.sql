-- =============================================================================
-- Renomeia a role financeiro -> precificacao
-- =============================================================================
-- A área nunca teve tela de finanças: o que existe sob ela é a precificação
-- (cálculo de preço, parâmetros de custo, taxas de canal, faixas de porte). O
-- nome "Financeiro" prometia um domínio — contas a pagar, fluxo de caixa, DRE —
-- que não foi construído. A rota já vive em /precificacao; aqui o slug da role
-- passa a dizer a mesma coisa.
--
-- public.has_role(slug) resolve a role POR SLUG em tempo de consulta — as
-- policies literalizam a string, não o id da role. Logo, no instante em que
-- roles.slug muda, toda policy que ainda diz has_role('financeiro') passa a
-- avaliar false para todo mundo, sem erro e sem warning. Por isso o update do
-- slug e a reescrita das policies estão na MESMA migration: a janela de acesso
-- negado entre as duas etapas não pode ser observável por outra sessão.
--
-- O rename é um UPDATE, nunca delete+insert: user_roles.role_id referencia
-- roles.id com on delete cascade, então recriar a linha apagaria em silêncio as
-- atribuições dos sócios.
-- =============================================================================

-- 1. Rename da role, preservando o id (e portanto user_roles)
--
-- Condicionado ao slug antigo para ser idempotente: no ambiente `dev` o slug já
-- foi trocado à mão antes desta migration existir, e ali este update é no-op —
-- mas as policies daquele banco continuam citando o slug antigo e é o passo 2
-- que as conserta.
update public.roles
set name = 'Precificação',
    slug = 'precificacao',
    updated_at = now()
where slug = 'financeiro';

-- =============================================================================
-- 2. Reescrita das policies — mesma expressão, só o slug muda
-- =============================================================================
-- Diferente da migration de rename de `marketplace-vendas` (20260714120000),
-- que reescreveu as 19 policies à mão, aqui a reescrita lê pg_policies e troca
-- só o literal. São ~40 policies em 15 tabelas, várias já redefinidas por
-- migrations posteriores às que as criaram — enumerá-las à mão exigiria saber,
-- para cada uma, qual foi a última definição vencedora. Partir do estado real
-- do catálogo elimina essa classe de erro por construção.
--
-- ALTER POLICY preserva cmd e roles; só as expressões são substituídas. USING e
-- WITH CHECK são aplicados conforme existam: policy de INSERT não aceita USING,
-- policy de SELECT/DELETE não aceita WITH CHECK.
do $$
declare
  p record;
  v_sql text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%''financeiro''%'
        or coalesce(with_check, '') like '%''financeiro''%')
  loop
    v_sql := format('alter policy %I on public.%I', p.policyname, p.tablename);

    if p.qual is not null then
      v_sql := v_sql || ' using (' || replace(p.qual, '''financeiro''', '''precificacao''') || ')';
    end if;

    if p.with_check is not null then
      v_sql := v_sql || ' with check (' || replace(p.with_check, '''financeiro''', '''precificacao''') || ')';
    end if;

    execute v_sql;
  end loop;
end $$;

-- =============================================================================
-- 3. View com predicado de papel embutido
-- =============================================================================
-- sales_monthly_results (de 20260724120000) filtra por has_role dentro do
-- próprio corpo, e não por policy — o loop acima não a alcança. Recriada aqui
-- idêntica, só com o slug novo.

create or replace view public.sales_monthly_results
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
  -- Precificação e sócios (design.md, decisão 8).
  and (
    public.is_socio_or_owner()
    or public.has_role('vendas')
    or public.has_role('precificacao')
  )
group by 1, 2;

-- =============================================================================
-- 4. Guarda: nada pode restar citando o slug antigo
-- =============================================================================
-- Uma policy ou view esquecida não quebra build nem typecheck — ela só nega
-- acesso, em silêncio, a quem tem a role. Falhar a migration aqui é a única
-- forma de a omissão ser detectada no momento em que ela acontece.

do $$
declare
  v_policies int;
  v_views int;
begin
  select count(*) into v_policies
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') like '%''financeiro''%'
      or coalesce(with_check, '') like '%''financeiro''%');

  if v_policies > 0 then
    raise exception
      'Ainda restam % policies citando has_role(''financeiro''); a role foi renomeada e elas negariam acesso em silêncio.',
      v_policies;
  end if;

  select count(*) into v_views
  from pg_views
  where schemaname = 'public'
    and definition like '%''financeiro''%';

  if v_views > 0 then
    raise exception
      'Ainda restam % views citando has_role(''financeiro''); a role foi renomeada e elas retornariam zero linhas em silêncio.',
      v_views;
  end if;
end $$;
