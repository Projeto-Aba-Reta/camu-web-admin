## Context

Domínio: **vendas**. `orders` é compartilhada entre a loja própria (`camu-web-landing-page`) e o ERP. Existem hoje **dois modelos de andamento** sobre a mesma linha de pedido:

1. **Funil de produção interno** — `orders.pipeline_stage_id` + `order_stage_events` + `order_pipeline_stages` (kanban do time: `pensando_modelagem` … `enviado`). Já tem tela, serviço (`SalesPipelineService`) e histórico.
2. **Status de acompanhamento do cliente** — `orders.status` (texto, vocabulário `pending/paid/in_production/finishing/shipped/delivered/cancelled`) + `order_events` (`status`, `note`, `created_at`, somente-adição). É o que a landing renderiza em `/pedido/[code]` numa timeline de 5 passos (`src/lib/status.ts` na landing). Hoje **só o webhook de pagamento da landing escreve** nesse modelo; o admin nem exibe `order_events`.

Os dois modelos são deliberadamente separados: o funil interno é granular e muda de forma; o status do cliente é estável e público. Esta mudança dá ao time controle do modelo 2 pelo admin, sem fundir os dois.

`camu-docs`: sem dependência.

## Goals / Non-Goals

**Goals:**
- Exibir `order_events` no detalhe do pedido e permitir atualizar `orders.status` + inserir `order_events` com nota.
- Movimentação livre, histórico somente-adição, autor registrado, acesso por role.
- Ponte opcional funil → status do cliente em 3 etapas mapeadas.
- Rota `/vendas/pedidos/codigo/[orderCode]` para os links da notificação de venda.

**Non-Goals:**
- Fundir o funil de produção com o status do cliente, ou derivar um do outro automaticamente e sempre.
- Alterar schema, o vocabulário de `orders.status` ou o mapa de timeline da landing.
- Notificar o cliente ativamente a cada mudança (a landing é pull).
- Editar/apagar `order_events`.
- Tornar o mapeamento etapa→status configurável por tela (fica como constante de código nesta versão).

## Decisions

### 1. Novo `OrderTrackingService` + repositório dedicado, sem tocar `SalesPipelineService`

`order_events` e `orders.status` ganham um serviço próprio (`OrderTrackingService`) e um `OrderTrackingRepository` (leitura de `order_events` por `order_id`, `update orders.status`, `insert order_events`). Mantém o funil de produção intacto e o novo domínio testável isolado.

_Alternativa descartada:_ estender `SalesPipelineService`. Rejeitada porque acoplaria dois modelos que a arquitetura mantém separados de propósito.

### 2. Vocabulário como constante compartilhada de intenção, duplicada nos dois repos

`CUSTOMER_ORDER_STATUSES = ['pending','paid','in_production','finishing','shipped','delivered','cancelled']` vira constante no admin (`src/lib/services/order-tracking`) espelhando `src/lib/status.ts` da landing. Não há pacote compartilhado; a task exige checagem cruzada e um comentário apontando o arquivo-par no outro repo.

### 3. Movimentação livre, sem máquina de estados

Como o funil, qualquer status → qualquer status, exceto igual ao atual (rejeitado). O time sabe o que está fazendo; travar transições geraria mais atrito que valor. `cancelled` também é livre (dá pra sair dele se foi engano).

### 4. Autor na `note`, não em coluna nova

`order_events` não tem coluna de autor e não vamos migrar. O serviço prefixa/sufixa a nota com o autor (ex.: `"[Ana] lixando e pintando"`) **ou** grava no log de auditoria de vendas existente. A landing trunca a nota em ~140 chars na exibição — o prefixo curto cabe. Decisão final entre as duas na fase de apply, conforme o log de auditoria já cubra pedidos.

### 5. Ponte funil→status como sugestão na server action de movimentação

O mapa `{ imprimindo: 'in_production', aguardando_envio: 'finishing', enviado: 'shipped' }` vive no `OrderTrackingService`. A UI de movimentação de etapa, quando a etapa de destino está no mapa e o status atual do cliente é diferente, mostra um checkbox "avisar o cliente (status: X)" marcado por padrão. A server action aplica os dois numa transação lógica (etapa primeiro; status como best-effort que não derruba a movimentação se falhar).

### 6. Rota por código faz `redirect` para a rota por id

`/vendas/pedidos/codigo/[orderCode]/page.tsx` resolve `order_code → id` via repositório e chama `redirect('/vendas/pedidos/' + id)`. Zero duplicação de tela. 404 quando não acha. Mesmo gate de auth (o próprio `[orderId]` já valida).

## Risks / Trade-offs

- **Vocabulário diverge entre os dois repos** → constante espelhada + teste que lista os valores + comentário cruzado; a proposta da landing tem a task-par de conferência.
- **Nota interna vaza pro cliente** → a ação deixa claro no rótulo do campo que a nota é lida pelo cliente; landing escapa como texto puro e trunca.
- **Dupla escrita (etapa + status) parcial** → etapa é a fonte primária e vai primeiro; status é best-effort; falha do status é logada e re-tentável pela ação manual. Sem rollback da etapa.
- **Time se confunde com dois "andamentos"** → a seção no detalhe separa visualmente "Produção (interno)" de "Acompanhamento do cliente"; textos de ajuda curtos.
- **`delivered` nunca é setado por ninguém** (não há gatilho automático) → aceitável; é ação manual do time quando confirma entrega. Documentar.

## Migration Plan

1. Sem migration de banco. Deploy do admin com a nova seção e ação.
2. `camu-web-landing-page`: configurar `ADMIN_BASE_URL` apontando pro admin após o deploy.
3. Rollback: reverter o commit do admin; `order_events` já escritos permanecem válidos (a landing os lê sem problema); nenhum estado órfão.

## Open Questions

- Autor na `note` vs. log de auditoria de vendas — depende de o log de auditoria já indexar `orders` (verificar em apply).
- O checkbox da ponte funil→status vem marcado ou desmarcado por padrão? (proposto: marcado para `enviado`, desmarcado para `imprimindo`.)
- `paid` deve ser editável manualmente ou só via webhook? (proposto: editável, mas com aviso de que o webhook pode sobrescrever.)
