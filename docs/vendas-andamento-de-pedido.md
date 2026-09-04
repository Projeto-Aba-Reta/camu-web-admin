# Andamento de pedido: dois modelos separados

A área de Vendas trabalha com **dois modelos de andamento** sobre a mesma
linha de `orders`, deliberadamente independentes (ver proposta OpenSpec
`gestao-de-status-de-pedido-da-loja`):

## 1. Funil de produção interno

- Dados: `orders.pipeline_stage_id` + `order_stage_events` +
  `order_pipeline_stages`.
- Uso: quadro kanban do time (`/vendas/funil`), etapas cadastráveis
  (`pensando_modelagem` … `enviado`), granular e muda de forma conforme a
  operação evolui.
- Serviço: `SalesPipelineService`.

## 2. Status de acompanhamento do cliente

- Dados: `orders.status` (vocabulário fixo `pending`, `paid`,
  `in_production`, `finishing`, `shipped`, `delivered`, `cancelled`) +
  `order_events` (`status`, `note`, `created_at`, somente-adição).
- Uso: é o que a **landing page** (`camu-web-landing-page`) renderiza em
  `/pedido/[code]` numa timeline de 5 passos — estável, público, não muda de
  forma. Antes desta mudança, só o webhook de pagamento escrevia aqui; agora
  o time também atualiza pelo detalhe do pedido
  (`/vendas/pedidos/[orderId]`, seção "Acompanhamento do cliente").
- Serviço: `OrderTrackingService`.
- O vocabulário precisa continuar **idêntico** ao `src/lib/status.ts` da
  landing — qualquer mudança nos dois lados exige checagem cruzada.

## Ponte opcional entre os dois

Ao mover um pedido para uma etapa do funil mapeada
(`imprimindo → in_production`, `aguardando_envio → finishing`,
`enviado → shipped`), a UI de movimentação sugere aplicar também o status de
cliente correspondente — opcional, não bloqueante. O mapa vive em
`STAGE_TO_CUSTOMER_STATUS` (`src/lib/services/order-tracking-service.ts`).

**Não fundir os dois modelos**: o funil não deriva o status do cliente
automaticamente (fora dessa sugestão pontual), e o status do cliente não
move o pedido no funil.

## Deep-link por código

`/vendas/pedidos/codigo/[orderCode]` resolve `order_code → id` e redireciona
para o detalhe do pedido — usado pelos links da notificação de venda da loja
própria, que só conhece o código, não o uuid.
