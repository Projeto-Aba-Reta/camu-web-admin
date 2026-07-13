-- =============================================================================
-- Seed do ambiente hospedado (dev/homologação) — equivalente ao `make dev`
-- local, porém com UM ÚNICO usuário.
--
-- Reproduz, em SQL puro, o que o ambiente local monta via:
--   supabase/seed.sql        (usuário owner)
--   npm run seed-roles       (7 roles — sem os 3 sócios de exemplo, ver abaixo)
--   npm run seed-pricing     (parâmetros de custo, impressora, faixas, taxas)
--   npm run seed-inventory   (insumos, compra inicial, limite mínimo)
--   npm run seed-catalog     (4 peças + cálculo + listagens + estoque)
--   npm run seed-slicing-sheets (uma ficha por peça calculada)
--   npm run seed-governance  (MEI, gatilhos, teto, log de decisões)
--
-- Diferenças deliberadas em relação ao ambiente local:
--   1. Um único usuário (Owner). Os sócios A/B/C do seed-roles não são
--      criados, e nenhuma role é atribuída a ninguém — o Owner enxerga todas
--      as áreas por user_type, sem precisar de role (ver Makefile, alvo seed).
--      As 7 roles são criadas mesmo assim, porque as telas de /admin/roles e
--      as policies (has_role) dependem do catálogo existir.
--   2. O titular do MEI é o próprio Owner (localmente é o socio-a@camu.local,
--      que aqui não existe).
--   3. Não escreve em audit_log: lá ele registra as ações do seed, o que não
--      tem valor num ambiente novo.
--
-- Pré-requisito: as migrations já aplicadas no projeto (supabase db push).
-- Idempotente: rodar de novo não duplica nada.
-- =============================================================================

-- crypt()/gen_salt() para o hash da senha do usuário. Já vem habilitado nos
-- projetos Supabase; o create garante o caso contrário.
create extension if not exists pgcrypto with schema extensions;

do $do$
declare
  -- >>> AJUSTE AQUI o usuário único do ambiente <<<
  v_email      text := 'owner@camu.dev';
  v_password   text := 'owner123456';
  v_full_name  text := 'Owner Dev';

  v_owner_id       uuid;
  v_cost_params    public.cost_parameters%rowtype;
  v_printer        public.printers%rowtype;
  v_filament_id    uuid;
  v_material_id    uuid;
  v_product_id     uuid;
  v_calc_id        uuid;
  v_sheet_id       uuid;
  v_tier           text;

  v_filament_cost  numeric;
  v_energy_cost    numeric;
  v_depr_cost      numeric;
  v_subtotal       numeric;
  v_failure_cost   numeric;
  v_total_cost     numeric;
  v_channel_prices jsonb;
  v_b2b_prices     jsonb;

  v_def            record;
  v_mat            record;
  v_prod           record;
  v_dec            record;
  v_date           record;
  v_item           record;
  v_item_id        uuid;
begin

-- ===========================================================================
-- 1. Usuário único (Owner) — supabase/seed.sql
-- ===========================================================================
-- Se o usuário já foi criado pelo painel (Authentication → Users), esta parte
-- só o localiza e promove a owner.

select id into v_owner_id from auth.users where email = v_email;

if v_owner_id is null then
  v_owner_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_owner_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_full_name),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_owner_id,
    v_owner_id::text,
    jsonb_build_object('sub', v_owner_id::text, 'email', v_email),
    'email',
    now(), now(), now()
  );

  raise notice 'Usuário % criado.', v_email;
else
  raise notice 'Usuário % já existia — mantido.', v_email;
end if;

-- O trigger on_auth_user_created já criou o profile com user_type='member';
-- promove a owner (idem se o usuário veio do painel).
insert into public.profiles (id, email, full_name, user_type, status)
values (v_owner_id, v_email, v_full_name, 'owner', 'active')
on conflict (id) do update
  set user_type = 'owner',
      status    = 'active',
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

-- ===========================================================================
-- 2. Roles — scripts/seed-roles.ts
-- ===========================================================================

insert into public.roles (name, slug, created_by)
values
  ('Produção',           'producao',        v_owner_id),
  ('Marketplace/Vendas', 'marketplace-vendas', v_owner_id),
  ('Site',               'site',            v_owner_id),
  ('Assinatura',         'assinatura',      v_owner_id),
  ('Infra/Automação',    'infra-automacao', v_owner_id),
  ('Financeiro',         'financeiro',      v_owner_id),
  ('Societário',         'societario',      v_owner_id)
on conflict (slug) do nothing;

-- ===========================================================================
-- 3. Precificação — scripts/seed-pricing.ts
-- ===========================================================================

-- cost_parameters é versionado por vigência (nunca sofre UPDATE): só insere
-- se ainda não houver nenhum registro.
if not exists (select 1 from public.cost_parameters) then
  insert into public.cost_parameters (
    filament_cost_per_kg, energy_cost_per_kwh, average_power_watts,
    failure_reserve_pct, packaging_cost, target_margin_pct, created_by
  ) values (130, 0.8, 150, 0.125, 3, 0, v_owner_id);
  raise notice 'cost_parameters criado.';
end if;

if not exists (select 1 from public.printers where name = 'Ender-3 V3 SE') then
  insert into public.printers (name, model, depreciation_per_hour, created_by)
  values ('Ender-3 V3 SE', 'Ender-3 V3 SE', 0.8, v_owner_id);
  raise notice 'Impressora Ender-3 V3 SE criada.';
end if;

insert into public.size_tier_ranges (tier, min_weight_grams, max_weight_grams, min_print_hours, max_print_hours)
select t.tier, t.min_w, t.max_w, t.min_h, t.max_h
from (values
  ('P', 5::numeric,  20::numeric,  0.5::numeric, 3::numeric),
  ('M', 20::numeric, 55::numeric,  3::numeric,   6::numeric),
  ('G', 55::numeric, 150::numeric, 6::numeric,   12::numeric)
) as t(tier, min_w, max_w, min_h, max_h)
where not exists (
  select 1 from public.size_tier_ranges existing where existing.tier = t.tier
);

insert into public.channel_fees (channel, percentage_fee, fixed_fee, created_by)
select t.channel, t.pct, t.fixed, v_owner_id
from (values
  ('mercado_livre', 0.14::numeric, 0::numeric),
  ('shopee',        0.20::numeric, 4::numeric),
  ('tiktok_shop',   0.10::numeric, 4::numeric),
  ('amazon',        0.15::numeric, 0::numeric),
  ('shein',         0.16::numeric, 0::numeric)
) as t(channel, pct, fixed)
where not exists (
  select 1 from public.channel_fees existing where existing.channel = t.channel
);

-- Carrega o vigente para os cálculos das peças (seção 5).
select * into v_cost_params
from public.cost_parameters
where valid_from <= now()
order by valid_from desc
limit 1;

select * into v_printer
from public.printers
where name = 'Ender-3 V3 SE'
order by valid_from desc
limit 1;

-- ===========================================================================
-- 4. Estoque de insumos — scripts/seed-inventory.ts
-- ===========================================================================
-- A embalagem entra abaixo do próprio limite mínimo (saldo 20 < 50) de
-- propósito, para o indicador de estoque baixo da topbar já aparecer.

for v_mat in
  select * from (values
    ('Filamento PLA genérico', 'filamento', 'kg',       90::numeric, 3::numeric,  1::numeric,
     'Investimento inicial (camu-docs/03-financeiro/investimento-inicial.md).'),
    ('Embalagem padrão',       'embalagem', 'unidade',  3::numeric,  20::numeric, 50::numeric,
     'Compra inicial de exemplo (seed-inventory) — abaixo do limite mínimo de propósito.')
  ) as t(name, type, unit, reference_cost, initial_purchase, minimum_quantity, purchase_notes)
loop
  select id into v_material_id from public.materials where name = v_mat.name;

  if v_material_id is null then
    insert into public.materials (name, type, unit, reference_cost, created_by)
    values (v_mat.name, v_mat.type, v_mat.unit, v_mat.reference_cost, v_owner_id)
    returning id into v_material_id;
    raise notice 'Insumo "%" criado.', v_mat.name;
  end if;

  -- material_stock_movements é append-only, sem chave natural: a compra
  -- inicial só entra se o insumo ainda não tiver nenhuma movimentação.
  if not exists (
    select 1 from public.material_stock_movements where material_id = v_material_id
  ) then
    insert into public.material_stock_movements (material_id, quantity, movement_type, notes, created_by)
    values (v_material_id, v_mat.initial_purchase, 'compra', v_mat.purchase_notes, v_owner_id);
  end if;

  insert into public.material_stock_thresholds (material_id, minimum_quantity, updated_by)
  values (v_material_id, v_mat.minimum_quantity, v_owner_id)
  on conflict (material_id) do nothing;
end loop;

select id into v_filament_id
from public.materials
where type = 'filamento'
order by created_at
limit 1;

-- ===========================================================================
-- 5. Catálogo — scripts/seed-catalog.ts
-- ===========================================================================
-- Para cada peça: cálculo de preço (mesma fórmula do PricingService), peça
-- vinculada ao cálculo, listagem em todos os canais no preço sugerido e
-- estoque inicial de peça pronta.

for v_def in
  select * from (values
    ('Miniatura Guardião de Pedra',
     'Miniatura colecionável de porte P, peça autoral da linha de miniaturas coloridas.',
     'miniatura_colecionavel', 15::numeric, 2.1::numeric, 6::numeric),
    ('Suporte de Celular Utilitário',
     'Suporte de mesa para celular, peça de linha utilitária de porte M.',
     'utilitario', 35::numeric, 4.2::numeric, 4::numeric),
    ('Vaso Personalizado com Nome',
     'Vaso decorativo personalizável (nome/cor sob encomenda), porte G.',
     'personalizado', 80::numeric, 8.4::numeric, 2::numeric),
    ('Leon Colecionável - Edição Padrão',
     'Peça da linha autoral Leon, porte M, edição padrão sem customização de cor.',
     'linha_leon', 35::numeric, 4.2::numeric, 3::numeric)
  ) as t(name, description, category, weight_grams, print_hours, initial_stock)
loop
  if exists (select 1 from public.products where name = v_def.name) then
    raise notice 'Peça "%" já existia — mantida.', v_def.name;
    continue;
  end if;

  -- Custo (PricingService.calculateCostBreakdown).
  v_filament_cost := (v_def.weight_grams / 1000) * v_cost_params.filament_cost_per_kg;
  v_energy_cost   := v_def.print_hours * (v_cost_params.average_power_watts / 1000) * v_cost_params.energy_cost_per_kwh;
  v_depr_cost     := v_def.print_hours * v_printer.depreciation_per_hour;
  v_subtotal      := v_filament_cost + v_energy_cost + v_depr_cost;
  v_failure_cost  := v_subtotal * v_cost_params.failure_reserve_pct;
  v_total_cost    := v_subtotal + v_failure_cost + v_cost_params.packaging_cost;

  -- Porte (PricingService.classifyTier): as 4 peças caem, sem ambiguidade,
  -- numa faixa que casa peso E tempo ao mesmo tempo.
  select r.tier into v_tier
  from public.size_tier_ranges r
  where r.valid_from <= now()
    and v_def.weight_grams between r.min_weight_grams and r.max_weight_grams
    and v_def.print_hours  between r.min_print_hours  and r.max_print_hours
  order by r.valid_from desc
  limit 1;

  -- Preço por canal: (custo × (1 + margem-alvo)) ÷ (1 - taxa%) + taxa fixa.
  with current_fees as (
    select distinct on (f.channel) f.channel, f.percentage_fee, f.fixed_fee
    from public.channel_fees f
    where f.valid_from <= now()
    order by f.channel, f.valid_from desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'channel', f.channel,
        'suggestedPrice', p.price,
        'margin', p.price * (1 - f.percentage_fee) - f.fixed_fee - v_total_cost
      )
      order by f.channel
    ),
    '[]'::jsonb
  )
  into v_channel_prices
  from current_fees f
  cross join lateral (
    select v_total_cost * (1 + v_cost_params.target_margin_pct) / (1 - f.percentage_fee) + f.fixed_fee as price
  ) p;

  -- Preço B2B: sem faixas cadastradas (o seed local também não cadastra),
  -- então o snapshot fica vazio, igual ao ambiente local.
  with current_tiers as (
    select distinct on (t.min_quantity) t.min_quantity, t.target_margin_pct
    from public.b2b_pricing_tiers t
    where t.valid_from <= now()
    order by t.min_quantity, t.valid_from desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'minQuantity', t.min_quantity,
        'suggestedPrice', v_total_cost * (1 + t.target_margin_pct),
        'margin', v_total_cost * (1 + t.target_margin_pct) - v_total_cost
      )
      order by t.min_quantity
    ),
    '[]'::jsonb
  )
  into v_b2b_prices
  from current_tiers t;

  insert into public.price_calculations (
    weight_grams, print_hours, printer_id, cost_parameters_id, suggested_tier,
    total_cost, cost_breakdown, channel_prices, b2b_prices, created_by
  ) values (
    v_def.weight_grams,
    v_def.print_hours,
    v_printer.id,
    v_cost_params.id,
    v_tier,
    v_total_cost,
    jsonb_build_object(
      'filamentCost',       v_filament_cost,
      'energyCost',         v_energy_cost,
      'depreciationCost',   v_depr_cost,
      'failureReserveCost', v_failure_cost,
      'packagingCost',      v_cost_params.packaging_cost
    ),
    v_channel_prices,
    v_b2b_prices,
    v_owner_id
  )
  returning id into v_calc_id;

  insert into public.products (
    name, description, category, size_tier, status, price_calculation_id, created_by
  ) values (
    v_def.name, v_def.description, v_def.category, v_tier, 'ativo', v_calc_id, v_owner_id
  )
  returning id into v_product_id;

  -- Listagem inicial em todos os canais, no preço sugerido pelo cálculo
  -- (CatalogService.linkPriceCalculation). O preço vem do próprio snapshot,
  -- então o trigger de divergência não exige price_override_reason.
  insert into public.product_channel_listings (product_id, channel, listed_price)
  select v_product_id, cp ->> 'channel', (cp ->> 'suggestedPrice')::numeric
  from jsonb_array_elements(v_channel_prices) as cp;

  insert into public.product_stock_movements (product_id, quantity, movement_type, notes, created_by)
  values (v_product_id, v_def.initial_stock, 'producao', 'Estoque inicial de exemplo (seed-catalog).', v_owner_id);

  raise notice 'Peça "%" criada (porte %, % un. em estoque).', v_def.name, v_tier, v_def.initial_stock;
end loop;

-- ===========================================================================
-- 6. Fichas de fatiamento — scripts/seed-slicing-sheets.ts
-- ===========================================================================
-- Uma ficha por peça com cálculo vinculado, reaproveitando peso/tempo/
-- impressora do cálculo. Suporte estimado em 15% do peso da peça (valor de
-- exemplo, não saída real de fatiadora).

for v_prod in
  select p.id, p.name, pc.weight_grams, pc.print_hours, pc.printer_id
  from public.products p
  join public.price_calculations pc on pc.id = p.price_calculation_id
  where pc.weight_grams is not null
    and pc.print_hours is not null
    and pc.printer_id is not null
loop
  insert into public.product_slicing_sheets (product_id, printer_id, print_hours, created_by)
  values (v_prod.id, v_prod.printer_id, v_prod.print_hours, v_owner_id)
  on conflict (product_id, printer_id) do update
    set print_hours = excluded.print_hours,
        updated_at  = now()
  returning id into v_sheet_id;

  -- As linhas são substituídas por completo a cada reedição da ficha.
  delete from public.product_slicing_sheet_materials where slicing_sheet_id = v_sheet_id;

  insert into public.product_slicing_sheet_materials (slicing_sheet_id, material_id, piece_grams, support_grams)
  values (
    v_sheet_id,
    v_filament_id,
    round(v_prod.weight_grams, 2),
    round(v_prod.weight_grams * 0.15, 2)
  );

  raise notice 'Ficha de fatiamento de "%" criada/atualizada.', v_prod.name;
end loop;

-- ===========================================================================
-- 7. Societário / governança — scripts/seed-governance.ts
-- ===========================================================================
-- Titular do MEI: o Owner (no local é o socio-a@camu.local, que não existe
-- neste ambiente de usuário único).

if not exists (select 1 from public.legal_entity_status) then
  insert into public.legal_entity_status (entity_type, titular_profile_id, created_by)
  values ('mei', v_owner_id, v_owner_id);
  raise notice 'legal_entity_status inicial (mei) criado.';
end if;

insert into public.legal_migration_triggers (trigger_type, status, updated_by)
values
  ('faturamento_proximo_teto',         'pendente', v_owner_id),
  ('lancamento_assinatura_recorrente', 'pendente', v_owner_id),
  ('necessidade_mais_funcionarios',    'pendente', v_owner_id),
  ('investimento_externo',             'pendente', v_owner_id)
on conflict (trigger_type) do nothing;

insert into public.mei_ceiling_parameters (year, annual_ceiling, created_by)
values (2026, 81000, v_owner_id)
on conflict (year) do nothing;

-- Log de decisões: transcrição de camu-docs/05-decisoes/log-decisoes.md.
-- Tabela append-only, sem chave de upsert — a checagem é por título.
for v_dec in
  select * from (values
    (
      'Registros financeiros reais versionados dentro do camu-docs',
      '2026-07-10'::date,
      'Era preciso organizar notas fiscais, recibos, comprovantes de PIX (aporte/retirada de sócio) e extratos bancários, tanto pra evitar problema fiscal quanto pra acompanhar o crescimento da empresa junto com a planilha de controle já prevista em controle-financeiro.md.',
      'Criar a pasta 07-registros-financeiros/ dentro do próprio camu-docs, versionada normalmente no git (não em pasta local separada, não com os arquivos sensíveis no .gitignore).',
      'Pasta local fora do git (nunca sincronizada via GitHub); pasta dentro do repo com a estrutura versionada mas os arquivos reais (PDFs/imagens) ignorados pelo git.',
      'Repositório já é privado no GitHub; priorizamos ter um único lugar sincronizado entre os sócios (planejamento + documentos reais) em vez de fragmentar em armazenamento local que não replica automaticamente entre as máquinas dos 3 sócios. Risco de dado sensível fica mitigado por manter o repo sempre privado.'
    ),
    (
      'Parque de impressoras se expande por papel, não por cópia da SE',
      '2026-07-09'::date,
      'Com a demanda de marketplace crescendo, início de solicitações B2B e aproximação do planejamento da assinatura recorrente, a Ender-3 V3 SE sozinha deixa de sustentar o volume e a diversidade de produto (a linha Leon e miniaturas coloridas pedem multi-cor, que a SE não faz nativamente).',
      'Ao invés de somar uma 2ª Ender-3 V3 SE, expandir o parque com a Bambu Lab A1 Combo (AMS Lite) primeiro — cobre multi-cor/multi-material para linha Leon, miniaturas e personalizados com cor customizada — e a Creality K1 Max em seguida, para volume, B2B e utilitários. A SE continua rodando (peças P e redundância).',
      'Comprar uma 2ª Ender-3 V3 SE; comprar só a Creality K1 Max (mais rápida, mas não resolve multi-cor).',
      'Multi-cor automatizado resolve um gargalo de tempo humano (pintura manual) maior do que o ganho de velocidade pura; o investimento da Bambu A1 Combo é menor (~R$4.750-5.750) que o do K1 Max (~R$6.000-7.000), então faz sentido priorizar a lacuna de capacidade que a SE realmente não cobre.'
    ),
    (
      'Sequenciamento de canais de marketplace por categoria de produto',
      '2026-07-08'::date,
      '7 marketplaces avaliados (Mercado Livre, Shopee, TikTok Shop, AliExpress, Temu, SHEIN, Amazon), cada um com mecanismo de descoberta e barreira de entrada diferentes; 4 dos 7 exigem CNPJ/MEI ativo.',
      'Ativar Mercado Livre primeiro (aceita CPF, serve personalizados e utilitários, dados mais limpos pra Fase 1), Shopee em seguida (com cautela na precificação por faixa). Assim que o MEI sair, priorizar TikTok Shop (casa com a linha Leon e o mecanismo de vídeo/conteúdo). SHEIN fica para mais adiante, condicionado a dados de tração. AliExpress e Temu ficam como baixa prioridade — competem em preço com produção industrial chinesa, o oposto do posicionamento autoral da marca.',
      'Abrir todos os canais disponíveis ao mesmo tempo assim que possível.',
      'Cada canal tem um mecanismo de descoberta que serve melhor uma categoria específica do catálogo — abrir todos de uma vez dilui atenção sem ganho real, e a barreira de CNPJ já impõe uma ordem natural.'
    ),
    (
      'Abrir MEI no nome de 1 sócio, com acordo particular entre os 3',
      '2026-07-07'::date,
      'Sociedade com 3 sócios em SJC, recursos limitados (investimento inicial de ~R$2.000-2.500 rateado entre os 3). MEI não permite sócios formalmente no CNPJ (só 1 titular); ME (Sociedade Limitada) permite os 3, mas exige contador mensal e alíquota do Simples sobre faturamento.',
      'Abrir MEI no nome de 1 sócio (quem toca produção/marketplace no dia a dia) durante as Fases 0-1, com os outros 2 sócios participando via acordo particular por escrito (não registrado em cartório). Formalizar como ME com os 3 no contrato social quando algum gatilho de migração ocorrer — tipicamente junto com o lançamento da assinatura recorrente (Fase 2-4) ou se o faturamento se aproximar do teto do MEI (R$81.000/ano em 2026).',
      'Abrir ME desde o início com os 3 sócios formais.',
      'Faturamento projetado da Fase 0-1 (~R$39-47 mil/ano) fica bem abaixo do teto do MEI; os 3 sócios são amigos de longa data e toparam manter informal nesta fase inicial sem risco de conflito relevante; custo do MEI (~R$82/mês) é muito menor que o de uma ME com contador.'
    ),
    (
      'Marketplace primeiro, site/assinatura em paralelo mas sem abrir ao público',
      '2026-07-06'::date,
      'Risco de sobrecarregar 1-2 pessoas com 3 frentes simultâneas (marketplace, site, pré-venda).',
      'Sequenciar — marketplace valida primeiro; site/backend de assinatura são construídos em paralelo pelo sócio dev, mas a abertura pública da assinatura fica condicionada ao catálogo autoral estar maduro (15-20 peças/categoria).',
      'Lançar as três frentes ao mesmo tempo (plano original).',
      'Marketplace gera caixa e dados de venda reais antes de qualquer investimento maior; evita lançar assinatura sem sustentação de catálogo.'
    ),
    (
      'Impressora inicial: Ender-3 V3 SE (não KE)',
      '2026-07-05'::date,
      'Escolha entre SE (mais barata, mais lenta) e KE (mais cara, mais rápida), com produção revezada entre os dois sócios.',
      'Começar com a SE.',
      'KE.',
      'Com revezamento de turnos entre os sócios, a máquina deixa de ser o gargalo — a diferença de R$ 600-700 pesa mais que o ganho de 30-40% de velocidade da KE. A economia vira reserva para uma 2ª impressora, se necessário.'
    )
  ) as t(title, decided_at, context, decision, alternatives_considered, reasoning)
loop
  if exists (select 1 from public.decision_log_entries where title = v_dec.title) then
    continue;
  end if;

  insert into public.decision_log_entries (
    title, context, decision, alternatives_considered, reasoning, decided_at, created_by
  ) values (
    v_dec.title, v_dec.context, v_dec.decision, v_dec.alternatives_considered,
    v_dec.reasoning, v_dec.decided_at, v_owner_id
  );
end loop;

-- ===========================================================================
-- 8. Calendário de marketing — NÃO existe no seed local
-- ===========================================================================
-- O ambiente local não popula estas tabelas (a feature é nova e ainda não tem
-- script de seed). Estas linhas existem só para a tela do calendário não
-- abrir vazia — apague esta seção inteira se quiser paridade exata com o
-- local.

for v_date in
  select * from (values
    ('Dia das Mães',      'movel', '2026-05-10', 'comercial'),
    ('Dia dos Pais',      'movel', '2026-08-09', 'comercial'),
    ('Black Friday',      'movel', '2026-11-27', 'comercial'),
    ('Dia das Crianças',  'fixa',  '10-12',      'comercial'),
    ('Halloween',         'fixa',  '10-31',      'sazonal'),
    ('Natal',             'fixa',  '12-25',      'sazonal')
  ) as t(name, rule_type, rule_value, category)
loop
  if not exists (select 1 from public.commemorative_dates_marketing where name = v_date.name) then
    insert into public.commemorative_dates_marketing (name, rule_type, rule_value, category, created_by)
    values (v_date.name, v_date.rule_type, v_date.rule_value, v_date.category, v_owner_id);
  end if;
end loop;

for v_item in
  select * from (values
    ('Teaser da linha Leon para o Dia das Crianças', 'Dia das Crianças', 'roteiro'::text, '2026-10-05'::date,
     array['instagram', 'tiktok', 'kwai']),
    ('Bastidores: da fatiadora à peça pronta',        null,              'ideia'::text,   null::date,
     array['instagram', 'youtube']),
    ('Contagem regressiva da Black Friday',           'Black Friday',    'ideia'::text,   '2026-11-20'::date,
     array['instagram', 'facebook'])
  ) as t(title, date_name, status, target_date, channels)
loop
  if exists (select 1 from public.social_content_plan_items where title = v_item.title) then
    continue;
  end if;

  insert into public.social_content_plan_items (
    commemorative_date_id, title, status, responsible_id, target_date, created_by
  ) values (
    (select id from public.commemorative_dates_marketing where name = v_item.date_name),
    v_item.title,
    v_item.status,
    v_owner_id,
    v_item.target_date,
    v_owner_id
  )
  returning id into v_item_id;

  insert into public.social_content_plan_item_channels (item_id, channel)
  select v_item_id, unnest(v_item.channels);
end loop;

raise notice 'Seed concluído. Login: % / %', v_email, v_password;

end
$do$;
