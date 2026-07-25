## 1. Banco de dados — migration

- [x] 1.1 Criar a migration `supabase/migrations/2026072X_vendas_funil_e_resultado.sql` e, nela, as tabelas `sale_origins` (slug único, nome, sort_order, is_active, requires_seller) e `order_pipeline_stages` (slug único, nome, sort_order, color, is_active, is_initial, is_final, requires_printer), com índices únicos parciais garantindo uma só etapa `is_initial` e uma só `is_final` entre as ativas
- [x] 1.2 Semear na própria migration as 7 etapas (`pensando_modelagem`, `aguardando_impressao`, `imprimindo`, `aguardando_embalagem`, `embalando`, `aguardando_envio`, `enviado`) e as 9 origens (`boca_a_boca`, `mercado_livre`, `shopee`, `tiktok_shop`, `amazon`, `shein`, `loja_propria`, `feira_evento`, `indicacao`), com as marcações de inicial/final/exige-impressora e exige-vendedor
- [x] 1.3 Adicionar em `orders` as colunas nuláveis `sale_origin_id`, `sold_by_profile_id`, `pipeline_stage_id` e `current_printer_id`, com `comment on column` explicando que `status` e `pipeline_stage_id` são eixos independentes (design, decisão 2)
- [x] 1.4 Fazer o backfill único de `orders.status` → `pipeline_stage_id` conforme o mapa da decisão 2 do design
- [x] 1.5 Criar o trigger `before insert` em `orders` que atribui a etapa `is_initial` quando `pipeline_stage_id` vem nulo
- [x] 1.6 Criar `order_stage_events` (order_id, from_stage_id, to_stage_id, printer_id, created_by, created_at) append-only e `order_costs` (order_id, amount_cents > 0, category em `filamento`/`embalagem`/`frete`/`taxa_canal`/`outros`, description, created_by)
- [x] 1.7 Criar as views `order_financials` (venda, custo somado, lucro por pedido) e `sales_monthly_results` (receita, gasto, lucro, contagem por mês, excluindo `status = 'cancelled'`), ambas com `security_invoker = true`
- [x] 1.8 Habilitar RLS e escrever as policies das tabelas e views novas conforme a matriz de acesso do design (decisão 8)
- [x] 1.9 Reescrever as policies de `orders` e `order_items` para incluir `has_role('vendas')` na leitura e liberar insert/update/delete de `orders` para `vendas`
- [x] 1.10 Adicionar ao final da migration o bloco `do $$` de guarda que falha se alguma policy de `orders`/`order_items` não citar `vendas`
- [x] 1.11 Rodar `supabase db reset` e `npm run db:types` para regenerar `src/lib/supabase/database.types.ts`

## 2. Backend — tipos, repositórios e serviços

- [x] 2.1 Criar `src/types/vendas.ts` com `SaleOrigin`, `OrderPipelineStage`, `SalesOrder`, `SalesOrderItem`, `OrderCost`, `OrderStageEvent`, `MonthlySalesResult` e a lista de categorias de custo
- [x] 2.2 Criar as interfaces de repositório em `src/lib/repositories/interfaces/`: `sale-origin-repository.interface.ts`, `order-pipeline-stage-repository.interface.ts`, `sales-order-repository.interface.ts`, `order-cost-repository.interface.ts`, `order-stage-event-repository.interface.ts` e `sales-result-repository.interface.ts`
- [x] 2.3 Implementar as seis versões Supabase em `src/lib/repositories/supabase/` e registrá-las em `src/lib/repositories/index.ts`
- [x] 2.4 Criar `src/lib/auth/sales-access.ts` com `canAccessSales`, `canWriteSalesOrder`, `canMoveSalesOrder`, `canWriteOrderCost`, `canReadSalesResult`, `canConfigureSales` e os `require*` correspondentes para Server Actions, espelhando a matriz do design
- [x] 2.5 Implementar `src/lib/services/sales-service.ts`: cadastro/edição/exclusão de pedido com validação de comprador, itens, quantidade > 0 e valores não negativos; snapshot de nome e preço do item a partir do catálogo; cálculo de subtotal/total; validação de vendedor obrigatório quando a origem exige
- [x] 2.6 Implementar `src/lib/services/sales-pipeline-service.ts`: movimentação entre etapas com validação de etapa ativa, exigência e validação de impressora ativa, limpeza de `current_printer_id` ao sair de etapa que exige impressora, e gravação do evento de histórico com autor
- [x] 2.7 Implementar no `sales-pipeline-service` o CRUD de etapas: criação, renomeação, recoloração, reordenação normalizada em transação, troca de inicial/final com desmarcação da anterior, e arquivamento bloqueado quando a etapa tem pedidos ou é a inicial
- [x] 2.8 Implementar em `sales-service` o CRUD de origens: criação com slug derivado, rejeição de slug duplicado, arquivamento, e rejeição de exclusão de origem já referenciada por pedido
- [x] 2.9 Implementar `src/lib/services/sales-result-service.ts`: leitura da view mensal, preenchimento dos meses sem pedido com zeros, período padrão (12 meses encerrados + mês corrente), tratamento de intervalo invertido, totais do período com margem indisponível quando a receita é zero, e quebra por origem incluindo origens arquivadas
- [x] 2.10 Implementar em `sales-service` os lançamentos de custo (criar, editar, excluir) com validação de valor > 0 e categoria dentro do conjunto fechado
- [x] 2.11 Escrever os testes de unidade dos serviços em `src/lib/services/*.test.ts`, cobrindo pelo menos: vendedor obrigatório por origem, movimentação para etapa arquivada, impressora obrigatória/inativa, arquivamento de etapa com pedidos, lucro negativo, margem com receita zero e série mensal com mês vazio
- [x] 2.12 Escrever teste de RLS em `supabase/tests/` verificando que um usuário só com role `marketing` não lê `orders`, `order_costs` nem `order_financials`, e que um usuário com role `vendas` lê e escreve pedido

## 3. Seed

- [x] 3.1 Criar `scripts/seed-vendas.ts` idempotente por `slug` para etapas e origens, sem reverter renomeações/reordenações feitas pelo time
- [x] 3.2 Registrar `seed-vendas` em `package.json` e incluí-lo em `seed-all`, depois de `seed-roles`
- [x] 3.3 Ajustar `scripts/seed-roles.ts` e seus comentários para refletir que a role `vendas` deixou de ser reserva sem tela

## 4. UI — navegação e estrutura da área

- [x] 4.1 Adicionar `vendas: { href: "/vendas/pedidos" }` em `src/lib/navigation/area-routes.ts`, atualizando o comentário que hoje explica a ausência da entrada
- [x] 4.2 Atualizar `src/lib/navigation/build-sidebar.test.ts` para cobrir a role `vendas` como item clicável
- [x] 4.3 Criar `src/app/(dashboard)/vendas/layout.tsx` com o guard de área e as abas Pedidos / Funil / Resultado / Configurações, exibindo apenas as abas permitidas ao perfil
- [x] 4.4 Criar `src/app/(dashboard)/vendas/actions.ts` com as Server Actions da área, cada uma chamando o `require*` correspondente de `sales-access.ts` antes de qualquer escrita

## 5. UI — pedidos

- [x] 5.1 Criar a página `vendas/pedidos/page.tsx` com a listagem (código, comprador, origem, vendedor, etapa, venda, custo, lucro) e os filtros de período, origem, vendedor e etapa via URL
- [x] 5.2 Criar `src/components/vendas/sales-order-form.tsx`: formulário de cadastro/edição com comprador, contato, origem (com vendedor condicional), itens do catálogo com quantidade e preço praticado, frete e observações
- [x] 5.3 Criar `src/components/vendas/sales-order-detail.tsx` com os dados do pedido, itens, custos lançados, lucro e o histórico de passagem por etapa em ordem cronológica
- [x] 5.4 Criar `src/components/vendas/order-cost-form.tsx` e `order-cost-list.tsx` para lançar, editar e excluir custos por categoria
- [x] 5.5 Criar `src/components/vendas/delete-sales-order-dialog.tsx` com confirmação explícita informando que itens, custos e histórico serão perdidos
- [x] 5.6 Exibir o aviso "custo não informado" na listagem e no detalhe quando o pedido não tem nenhum lançamento de custo

## 6. UI — funil kanban

- [x] 6.1 Criar a página `vendas/funil/page.tsx` renderizando uma coluna por etapa ativa na ordem cadastrada, com contagem e o corte de pedidos finalizados há mais de 30 dias, com toggle `?historico=1`
- [x] 6.2 Criar `src/components/vendas/sales-pipeline-board.tsx` e `sales-order-card.tsx` (código, comprador, origem, vendedor, valor, impressora atual)
- [x] 6.3 Criar `src/components/vendas/move-order-dialog.tsx` com o menu "Mover para…" das etapas ativas e o `select` de impressoras ativas quando a etapa destino exige impressora
- [x] 6.4 Criar `src/components/vendas/labels.ts` com os rótulos de categoria de custo e demais textos fixos da área

## 7. UI — configurações de etapas e origens

- [x] 7.1 Criar a página `vendas/configuracoes/page.tsx` com as duas seções, restrita a quem pode configurar
- [x] 7.2 Criar `src/components/vendas/pipeline-stage-form.tsx` e `pipeline-stage-list.tsx` com criar, renomear, recolorir, reordenar, marcar inicial/final/exige-impressora e arquivar
- [x] 7.3 Criar `src/components/vendas/sale-origin-form.tsx` e `sale-origin-list.tsx` com criar, renomear, reordenar, marcar exige-vendedor e arquivar
- [x] 7.4 Exibir no formulário de arquivamento de etapa a contagem de pedidos que bloqueia a operação

## 8. UI — resultado e gráfico

- [x] 8.1 Instalar `recharts` e adicionar as variáveis `--chart-1..3` ao tema em `src/app/globals.css`, cobrindo claro e escuro
- [x] 8.2 Criar `src/components/vendas/sales-result-chart.tsx` como componente cliente que recebe a série por props, com legenda, tooltip por mês e responsividade em largura de celular
- [x] 8.3 Criar a página `vendas/resultado/page.tsx` com o seletor de período na URL, o gráfico, os totais (receita, gasto, lucro, margem, contagem) e a quebra por origem
- [x] 8.4 Tratar o estado vazio: mensagem de ausência de dados no lugar do gráfico quando o período não tem pedidos, e margem indisponível quando a receita é zero

## 9. Fechamento

- [x] 9.1 Rodar `npm run lint`, `npm test` e `npm run build` e corrigir o que aparecer
- [x] 9.2 Verificar manualmente o fluxo ponta a ponta: cadastrar venda boca-a-boca com vendedor → mover pelas 7 etapas escolhendo impressora em "Imprimindo" → lançar custo → conferir o lucro na listagem e o mês no gráfico
- [x] 9.3 Rodar `openspec validate --changes tela-de-vendas-e-funil-de-pedidos`
- [x] 9.4 Commitar seguindo a convenção (`Feat(vendas): ...`) — commit 22dbe30
