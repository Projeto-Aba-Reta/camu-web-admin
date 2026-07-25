## Why

O domínio **vendas** é o único dos cinco domínios de gestão que ainda não tem tela: a role `vendas` (Vendas/Marketplace) foi semeada como reserva de nome, sem rota e sem policy, e a tabela `orders` só recebe pedidos que a landing page insere via service role. Hoje uma venda fechada no boca-a-boca, numa feira ou num marketplace não existe em lugar nenhum do ERP — não se sabe quem vendeu, em que etapa da produção o pedido está, quanto de fato se gastou para entregá-lo, nem se o mês deu lucro.

Este change ativa a área de Vendas com um funil operacional (do "pensando na modelagem" ao "enviado") e o par preço de venda × custo real, que é o insumo mínimo para o acompanhamento de faturamento x teto do MEI e para o fechamento mensal que o `camu-docs` descreve.

**Domínio afetado:** vendas (principal), com leitura compartilhada por financeiro (lucro/gasto, faturamento) e produção (etapa e impressora do pedido).

**Dependência com `camu-docs`:** o valor de venda registrado aqui passa a ser fonte do faturamento acumulado usado no alerta de teto do MEI. Este change **não** altera essa regra — apenas garante que a venda manual seja contabilizável. A definição de "lucro" adotada é operacional (venda − custo real informado), não contábil: não desconta DAS, pró-labore nem rateio de custo fixo.

## What Changes

- **Nova área Vendas na sidebar**, ativando a role `vendas` já reservada: rota `/vendas/pedidos`, com as sub-rotas de funil e resultado. A role deixa de ser item não-clicável.
- **Cadastro manual de pedido de venda** no ERP: comprador (nome, contato), itens (peça do catálogo + quantidade + preço unitário praticado), preço total de venda e observações. Reaproveita `orders`/`order_items`, que hoje só a loja do site alimenta — pedido do site e venda cadastrada à mão passam a viver no mesmo funil.
- **Origem da venda cadastrável**: tabela de origens (`boca_a_boca`, `mercado_livre`, `shopee`, `tiktok_shop`, `amazon`, `shein`, `loja_propria`, `feira_evento`, `indicacao`) editável pelo time, e no pedido a origem escolhida mais o **vendedor responsável** (perfil do time) quando a origem exige atribuição — o caso "boca-a-boca de quem?".
- **Funil de pedidos em kanban com colunas cadastráveis**: etapas com nome, ordem e cor, editáveis (criar, renomear, reordenar, arquivar), semeadas com _Pensando na modelagem → Aguardando impressão → Imprimindo → Aguardando embalagem → Embalando → Aguardando envio → Enviado_. Uma etapa pode ser marcada como "exige impressora", e ao mover o pedido para ela o sistema pede em qual impressora do parque o pedido está — reaproveitando `printers`.
- **Custo real por pedido**: campo de quanto efetivamente se gastou para produzir/entregar aquele pedido (filamento, embalagem, frete, taxa do canal), lançado como valor único com nota, ao lado do preço vendido.
- **Painel de resultado com gráfico** de receita, gasto e lucro por mês, mais totais do período e recorte por origem de venda. Introduz `recharts` como dependência de gráficos do projeto.
- `orders.status` (o eixo logístico atual: `pending`…`delivered`) deixa de ser o que a tela de vendas mostra; o funil passa a ser a etapa cadastrável. `status` continua existindo e sendo escrito pela landing page — os dois convivem, e a migration mapeia o status atual para a etapa-semente correspondente. **Não é BREAKING** para a landing page: nenhuma coluna existente é removida ou renomeada.

### Non-goals

- Integração automática com marketplaces (importar venda do Mercado Livre por API) — a venda de marketplace é cadastrada à mão nesta fase.
- Vincular pedido à fila de impressão (`print_queue_items`) automaticamente. A etapa "Imprimindo" registra a impressora, mas não cria item na fila; essa ponte fica para um change próprio.
- Rateio de custo fixo, DAS ou pró-labore no cálculo de lucro.
- Pré-venda por lote e assinatura recorrente.

## Capabilities

### New Capabilities

- `registro-de-pedidos-de-venda`: cadastro manual de venda no ERP — comprador, itens do catálogo, preço praticado, origem, vendedor responsável — e a coexistência com os pedidos que a loja do site já insere.
- `origem-de-venda`: catálogo editável de origens de venda, com a marcação de quais origens exigem vendedor responsável, e as regras de validação/arquivamento de uma origem já usada.
- `etapas-do-funil-de-pedidos`: cadastro das colunas do kanban — nome, ordem, cor, flag de "exige impressora", etapa inicial e etapa final — com seed inicial e regras de reordenação/arquivamento.
- `funil-de-pedidos`: comportamento do quadro — pedido ocupa exatamente uma etapa, movimentação entre etapas, exigência de impressora nas etapas marcadas, e histórico de passagem por etapa.
- `custo-real-de-pedido`: lançamento do valor efetivamente gasto em um pedido e a derivação do lucro daquele pedido.
- `resultado-de-vendas`: agregação de receita, gasto e lucro por mês e por origem, e o gráfico que a tela exibe.
- `tela-de-vendas`: a área Vendas no dashboard — rota, guard de acesso, abas (Pedidos / Funil / Resultado) e o que cada perfil vê.

### Modified Capabilities

- `seed-de-dados-iniciais`: a role `vendas` deixa de ser reserva sem tela e sem policy — passa a ter rota, policies próprias e item clicável na sidebar; o seed passa também a semear as etapas do funil e as origens de venda.

## Impact

**Banco (Supabase):** nova migration criando `sale_origins`, `order_pipeline_stages`, `order_stage_events` e `order_costs`; colunas novas em `orders` (`sale_origin_id`, `sold_by_profile_id`, `pipeline_stage_id`, `current_printer_id`); RLS para a role `vendas` nessas tabelas e ampliação das policies de `orders`/`order_items` para incluir `vendas`. `database.types.ts` regenerado.

**Código:** novas interfaces + implementações Supabase em `src/lib/repositories/`, `SalesService`/`SalesPipelineService` em `src/lib/services/`, guard `sales-access.ts` em `src/lib/auth/`, entrada `vendas` em `src/lib/navigation/area-routes.ts` (com ajuste no comentário que hoje explica a ausência), rotas em `src/app/(dashboard)/vendas/**`, componentes em `src/components/vendas/`, e um componente de gráfico em `src/components/ui/`.

**Dependências:** `recharts` (nova, client-side).

**Sistemas externos:** a landing page (`camu-web-landing-page`) continua inserindo em `orders` via service role sem alteração — os campos novos são nuláveis com default, e um trigger atribui a etapa inicial do funil a pedidos criados sem etapa.

**Seed:** `scripts/seed-roles.ts` (role `vendas` deixa de ser reserva) e novo `npm run seed-vendas` para etapas e origens.
