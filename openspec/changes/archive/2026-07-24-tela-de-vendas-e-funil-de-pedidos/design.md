## Context

O ERP já tem `orders`, `order_items` e `order_events`, criadas em `20260722120000_pedidos_loja_e_canal_site.sql` para receber os pedidos que a landing page (`camu-web-landing-page`) insere via `service_role`. Nenhuma tela do admin lê essas tabelas hoje: elas foram criadas como destino da loja do site, e o ERP ficou como "dono futuro".

A role `vendas` (Vendas/Marketplace) foi semeada em `20260714120000_renomear_role_marketplace_vendas_para_marketing.sql` explicitamente como reserva de nome — sem rota em `areaRoutes` e sem nenhuma policy citando `has_role('vendas')`. Este change é o que preenche essa reserva.

Convenções vigentes no repositório que este design segue sem discutir: valores monetários em centavos (`integer`); acesso via `public.is_socio_or_owner()` / `public.has_role(slug)` em RLS, espelhado por um módulo `src/lib/auth/*-access.ts` para os guards de rota e de Server Action; camada de dados em `src/lib/repositories/interfaces` + `supabase/`, orquestração em `src/lib/services`, páginas como Server Components que instanciam `createRepositories(supabase)`; estado de tela (mês, aba, filtro) na URL, não em estado de cliente.

## Goals / Non-Goals

**Goals:**

- Um único funil e um único cadastro de venda para pedidos do site e vendas fechadas fora dele.
- Colunas do kanban editáveis pelo time sem deploy.
- Registrar preço vendido e custo real por pedido, com lucro derivado.
- Gráfico mensal de receita × gasto × lucro.
- Não quebrar a landing page, que continua escrevendo em `orders` via `service_role`.

**Non-Goals:**

- Integração com API de marketplace.
- Criar item em `print_queue_items` a partir do pedido.
- Drag-and-drop no kanban (movimentação por menu/botão nesta fase).
- Realtime / atualização automática do quadro entre usuários.
- Qualquer noção contábil de lucro (DAS, pró-labore, rateio de custo fixo).

## Decisions

### 1. Estender `orders` em vez de criar uma tabela `sales`

Duas fontes de venda com dois esquemas obrigariam toda leitura de resultado a fazer `union` e toda tela a decidir de qual tabela veio o registro. `orders` já tem comprador, endereço, itens com snapshot de nome/preço, totais em centavos e código amigável — exatamente o que o cadastro manual precisa. As colunas novas (`sale_origin_id`, `sold_by_profile_id`, `pipeline_stage_id`, `current_printer_id`) são nuláveis e não têm `not null`, então o `insert` que a landing page faz hoje continua válido sem mudança de código do lado dela.

**Alternativa considerada:** tabela `sales` separada com FK opcional para `orders`. Rejeitada: duplicaria itens e comprador, e o gráfico de resultado teria de reconciliar duas fontes que divergiriam na primeira correção manual.

### 2. Etapa do funil é uma tabela, `orders.status` continua existindo em paralelo

`orders.status` é um `check` fechado (`pending`…`delivered`) que a landing page e o webhook do Mercado Pago escrevem. Transformá-lo em FK para etapas cadastráveis quebraria esse contrato externo. Então: `order_pipeline_stages` é a fonte de verdade do quadro; `orders.status` permanece intocado como eixo logístico/de pagamento do site.

A migration mapeia o `status` atual de cada pedido existente para a etapa-semente correspondente uma única vez (`paid`/`pending` → *Pensando na modelagem*, `in_production` → *Aguardando impressão*, `finishing` → *Aguardando embalagem*, `shipped`/`delivered` → *Enviado*). Depois disso os dois campos evoluem independentemente — a tela de vendas mostra a etapa, e nada tenta mantê-los sincronizados. Isso é deliberado: sincronizar bidirecionalmente dois vocabulários, um fechado e um editável pelo usuário, é a fonte clássica de estado inconsistente.

`cancelled` é o único ponto em que `status` ainda governa vendas: o resultado financeiro exclui pedidos com `status = 'cancelled'` (spec `resultado-de-vendas`).

**Trigger de etapa inicial:** um `before insert` atribui a etapa marcada `is_initial` quando `pipeline_stage_id` vem nulo. É o que permite a landing page continuar inserindo sem conhecer o funil.

### 3. Movimentação registra evento em tabela nova, não em `order_events`

`order_events` existe e é escrita pela landing page com o `status` textual do site. Misturar nela os eventos de etapa do funil obrigaria todo leitor a distinguir os dois vocabulários por convenção. `order_stage_events` (from/to/impressora/autor/quando) é append-only e independente.

### 4. Custo real como tabela de lançamentos, não coluna única em `orders`

O usuário pediu "quanto realmente gastou". Uma coluna `actual_cost_cents` seria mais simples, mas o custo chega em pedaços e em momentos diferentes — produção sabe o filamento, vendas sabe a taxa do canal, quem despacha sabe o frete. `order_costs` (valor, categoria, descrição, autor) permite cada área lançar a sua parte sem sobrescrever a das outras, e a categoria alimenta análise posterior de para onde vai o dinheiro. Custo real do pedido = `sum(order_costs.amount_cents)`.

**Trade-off aceito:** toda leitura de lucro precisa agregar. Resolvido com uma view (decisão 5), não com coluna desnormalizada mantida por trigger.

### 5. Agregação em views SQL, não em TypeScript

Duas views: `order_financials` (por pedido: total de venda, custo somado, lucro) e `sales_monthly_results` (por mês: receita, gasto, lucro, contagem). Views herdam a RLS das tabelas base — `security_invoker = true` — então não abrem brecha de acesso. Manter a agregação no banco evita puxar todos os pedidos do período para somar em memória, e mantém a listagem de pedidos com lucro em uma query só.

Meses sem pedido não existem na view; a série contínua exigida pela spec é preenchida pelo service, que gera o eixo de meses do período e faz `left join` com o que a view retornou. Preencher lacuna de calendário é lógica de apresentação, não de dados.

### 6. `recharts` para o gráfico

Decisão do usuário. Componente cliente (`"use client"`) isolado em `src/components/vendas/sales-result-chart.tsx`, recebendo a série já agregada por props do Server Component — nenhuma consulta parte do cliente. Cores vindas das variáveis CSS do tema (`--chart-1..3` adicionadas em `globals.css`) para que claro/escuro funcionem sem lógica de tema no componente.

### 7. Movimentação por menu, não drag-and-drop

O quadro existente de marketing (`marketing-board.tsx`) move itens por botão "avançar", sem biblioteca de DnD. Manter o mesmo padrão: cada cartão tem um menu "Mover para…" com as etapas ativas. Quando a etapa destino exige impressora, o menu abre um diálogo com o `select` de impressoras ativas — mesmo padrão de `start-printing-dialog.tsx` na fila de impressão. Isso evita introduzir `dnd-kit` e mantém a movimentação acessível por teclado.

### 8. Acesso: `vendas` escreve venda, `producao` move e lança custo, `financeiro` lê resultado

A matriz das specs, consolidada:

| | ler pedido | escrever pedido | mover etapa | lançar custo | ler resultado | config etapas/origens |
|---|---|---|---|---|---|---|
| owner/socio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `vendas` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `producao` | ✓ | — | ✓ | ✓ | — | — |
| `financeiro` | ✓ | — | — | ✓ | ✓ | — |
| `marketing` | — | — | — | — | — | ler origens |

"lançar custo" implica ler custo e lucro **daquele pedido**: quem lança precisa conferir e corrigir o que lançou. O que `producao` não vê é a agregação do período — e isso é imposto no banco, não só na rota: a view `sales_monthly_results` carrega no seu próprio `where` o predicado de papel (`is_socio_or_owner() or has_role('vendas') or has_role('financeiro')`), de modo que `security_invoker` não a torne legível para quem lê as tabelas base.

`orders` e `order_items` já têm policies de leitura para `financeiro`/`producao`; a migration as reescreve para incluir `vendas` e amplia o `insert`/`update`/`delete` de `orders` (hoje restrito a `is_socio_or_owner()`) para `vendas`. Como no rename da role, o `drop policy` + `create policy` de cada uma vai na mesma migration, e ao final um bloco `do $$` verifica que nenhuma policy de `orders`/`order_items` ficou sem citar `vendas` — omissão em policy não quebra build, só nega acesso em silêncio.

`marketing` lê origens de venda porque o calendário de conteúdo vai querer saber de onde vêm as vendas; não lê pedido nem custo.

### 9. Rota `/vendas` com abas por sub-rota

`src/app/(dashboard)/vendas/layout.tsx` faz o guard de área (mesmo formato do `marketing/layout.tsx`) e renderiza as abas. Sub-rotas: `pedidos/`, `funil/`, `resultado/`, `configuracoes/`. Cada uma revalida a sua própria permissão — `resultado` e `configuracoes` são mais restritas que a área. Entrada `vendas: { href: "/vendas/pedidos" }` em `areaRoutes`, com atualização do comentário que hoje explica por que ela não existe.

### 10. Pedidos finalizados há mais de 30 dias saem do quadro

Sem esse corte a coluna "Enviado" cresce indefinidamente e o quadro fica inutilizável em poucos meses. O corte é de exibição: filtro na query do funil (`stage.is_final = false OR updated_at >= now() - interval '30 days'`), com um toggle na URL (`?historico=1`) para ver tudo. A listagem de pedidos nunca aplica esse corte.

## Risks / Trade-offs

- **A landing page insere pedido sem origem e sem vendedor** → colunas nuláveis + trigger de etapa inicial; a tela exibe origem "loja própria" como default de leitura, sem gravar. Se depois quisermos gravar de fato, é um `update` de backfill, não um schema change.
- **`orders.status` e etapa do funil divergem** → é o comportamento desejado (decisão 2), mas confunde quem olhar o banco direto. Mitigação: `comment on column` em ambos explicando que são eixos independentes, e a tela de vendas nunca exibe `status` a não ser para pedidos cancelados.
- **Excluir pedido apaga custos e histórico em cascata** → aceito, é a spec. Mitigação: confirmação explícita no diálogo de exclusão informando o que será perdido, mesmo padrão de `cancel-print-queue-item-dialog.tsx`.
- **Lucro sem custo lançado parece lucro total** → a spec exige o aviso "custo não informado" na listagem e no cartão; sem isso o gráfico do primeiro mês mostraria margem de 100% e seria lido como verdade.
- **`recharts` no bundle do cliente** → isolado em um único componente carregado apenas na aba Resultado; nenhuma outra tela paga o custo.
- **Reordenar etapas com posições inteiras exige reescrever várias linhas** → a reordenação normaliza as posições em uma transação (`update ... from (values ...)`). Com sete etapas o custo é irrelevante; não vale introduzir posição fracionária.
- **Views com `security_invoker`** → se a policy de `order_costs` for esquecida, a view vaza custo para quem não deveria ver. Mitigação: teste em `supabase/tests` verificando que um usuário só com `marketing` recebe zero linhas de `order_financials`.

## Migration Plan

Uma única migration, `2026072X_vendas_funil_e_resultado.sql`, na ordem:

1. `sale_origins` e `order_pipeline_stages` (tabelas + índices únicos parciais para `is_initial`/`is_final` entre as ativas).
2. Seed das sete etapas e das nove origens dentro da própria migration — o funil não pode existir sem etapa inicial, então isso é estrutura, não dado de conveniência. O `npm run seed-vendas` é para reaplicar/ajustar em ambientes já existentes.
3. Colunas novas em `orders` + `comment on column`.
4. Backfill: mapeia `orders.status` → `pipeline_stage_id` (decisão 2); origem fica nula.
5. Trigger `before insert` de etapa inicial.
6. `order_stage_events` e `order_costs`.
7. Views `order_financials` e `sales_monthly_results` com `security_invoker = true`.
8. RLS das tabelas novas + reescrita das policies de `orders`/`order_items` incluindo `vendas`.
9. Bloco `do $$` de guarda: falha se alguma policy de `orders`/`order_items` não citar `vendas`.

**Rollback:** as tabelas e colunas são aditivas; o rollback é `drop` das tabelas/views novas e das colunas novas em `orders`, mais a restauração das policies anteriores. Nenhum dado pré-existente é destruído ou reinterpretado — o backfill do passo 4 só preenche coluna nova.

**Ordem de deploy:** migration → `npm run db:types` → código. A landing page não precisa de deploy coordenado.

## Open Questions

- O mês de atribuição do pedido no resultado é o de `created_at`. Quando a venda for registrada com atraso (venda de feira lançada uma semana depois), ela cai no mês do lançamento, não no da venda. Se isso incomodar, o remédio é uma coluna `sold_at` editável — deixada de fora agora para não adicionar campo antes de haver a dor.
- Categorias de custo estão fechadas em `check` (`filamento`, `embalagem`, `frete`, `taxa_canal`, `outros`). Se o time pedir categorias próprias, viram tabela — mesmo caminho de origens e etapas.
- Vincular o pedido a itens da fila de impressão (`print_queue_items`) resolveria o custo de filamento automaticamente, via ficha de fatiamento. Fora de escopo aqui; é o próximo change natural desta área.
