## Why

Domínio afetado: **vendas**. Os pedidos da loja própria caem no ERP na mesma entidade `orders` e aparecem no funil de produção, mas o time não tem como atualizar o **status de acompanhamento que o cliente vê** na landing page (`orders.status` + `order_events`, lidos em `/pedido/[code]`). Hoje esse status só avança sozinho pelo webhook de pagamento; depois disso, "em produção → acabamento → enviado → entregue" nunca muda pro cliente, mesmo com o pedido andando no funil interno. O time precisa de uma ação no admin pra mover esse status e escrever uma nota que aparece na timeline do cliente.

## What Changes

- Nova seção no detalhe do pedido (`/vendas/pedidos/[orderId]`) que exibe a **timeline de acompanhamento do cliente** (`order_events`, hoje não mostrada — o detalhe só mostra o histórico do funil de produção) e oferece uma ação **"Atualizar status do cliente"**.
- A ação define `orders.status` dentro do vocabulário `pending`, `paid`, `in_production`, `finishing`, `shipped`, `delivered`, `cancelled` e insere uma linha em `order_events` (`status` + `note` opcional). `order_events` é **somente-adição** — nunca edita nem apaga.
- Movimentação livre (frente e trás) entre status, como no funil; nota opcional em cada mudança; autor e instante registrados na `note`/log de auditoria.
- **Vínculo opcional com o funil de produção**: ao mover um pedido para etapas-chave do funil (`imprimindo`, `aguardando_envio`, `enviado`), o sistema sugere o status de cliente correspondente (`in_production`, `finishing`, `shipped`) numa confirmação — sem forçar, mantendo os dois modelos independentes.
- **Rota de deep-link por código**: `/vendas/pedidos/codigo/[orderCode]` resolve o `order_code` e leva ao detalhe do pedido, pra a notificação de venda da landing page linkar direto (a landing só conhece o código, não o uuid).
- Controle de acesso: ler o status a `owner`/`socio` ou às roles `vendas`, `producao`, `precificacao`; atualizar a `owner`/`socio` ou às roles `vendas` e `producao`.
- **BREAKING**: nenhuma. Sem migration — `orders.status` e `order_events` já existem (migration `20260722120000_pedidos_loja_e_canal_site.sql`).

## Capabilities

### New Capabilities
- `status-de-acompanhamento-do-cliente`: exibição da timeline de acompanhamento do cliente no detalhe do pedido e a ação de atualizar `orders.status` + `order_events` seguindo o vocabulário lido pela landing page, com movimentação livre, nota opcional e controle de acesso.
- `deep-link-de-pedido-por-codigo`: rota `/vendas/pedidos/codigo/[orderCode]` que resolve um pedido pelo `order_code` e entrega o detalhe, usada pelos links da notificação de venda da loja.

### Modified Capabilities
- `funil-de-pedidos`: ao mover um pedido para etapas de produção mapeadas, o sistema passa a sugerir a atualização do status de acompanhamento do cliente na mesma interação (opcional, não bloqueante).

## Impact

- **Dados**: sem mudança de schema. Novas escritas em `orders.status` e `order_events` a partir do admin (antes só a landing/webhook escrevia). Dependência com `camu-docs`: nenhuma.
- **`src/lib/repositories/`**: repositório novo (ou método) para ler/inserir `order_events` e atualizar `orders.status` (`supabase-sales-order-repository.ts` ou um `order-tracking-repository`).
- **`src/lib/services/`**: `SalesService` ou novo `OrderTrackingService` com a regra de vocabulário, movimentação livre e sugestão a partir da etapa do funil.
- **`src/app/(dashboard)/vendas/pedidos/[orderId]/page.tsx`** + `components/vendas/sales-order-detail.tsx`: carregar e exibir `order_events`; nova UI da ação de status.
- **`src/app/(dashboard)/vendas/actions.ts`**: server action `updateCustomerStatus(orderId, status, note?)`.
- **Nova rota** `src/app/(dashboard)/vendas/pedidos/codigo/[orderCode]/page.tsx` (resolve e faz `redirect` pro `[orderId]`).
- **`src/lib/auth/sales-access.ts`**: helper de permissão pra atualização de status (reaproveita as roles de movimentação do funil).
- **Contrato com `camu-web-landing-page`**: a landing page tem a proposta irmã `deep-link-admin-no-pedido` — passa a linkar `${ADMIN_BASE_URL}/vendas/pedidos/codigo/{order_code}` na notificação e a exibir a `note` dos `order_events` pro cliente. Os vocabulários de `orders.status` e o mapa de timeline (`src/lib/status.ts` na landing) precisam continuar iguais nos dois lados.
