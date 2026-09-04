## ADDED Requirements

### Requirement: Sugestão de status de acompanhamento ao mover etapa do funil

Ao mover um pedido para uma etapa do funil mapeada para um status de acompanhamento do cliente (`imprimindo` → `in_production`, `aguardando_envio` → `finishing`, `enviado` → `shipped`), o sistema SHALL oferecer, na mesma interação, aplicar também esse status de acompanhamento. A aplicação SHALL ser opcional e não bloqueante — recusar a sugestão SHALL concluir a movimentação de etapa normalmente. Etapas sem mapeamento SHALL não exibir a sugestão.

#### Scenario: Mover para "Enviado" aceitando a sugestão

- **WHEN** um usuário move um pedido para a etapa `enviado` e confirma a sugestão de atualizar o acompanhamento do cliente
- **THEN** o sistema conclui a movimentação de etapa e também define `orders.status = shipped` com um `order_events` correspondente

#### Scenario: Mover para "Enviado" recusando a sugestão

- **WHEN** um usuário move um pedido para a etapa `enviado` e recusa a sugestão
- **THEN** o sistema conclui a movimentação de etapa e não altera `orders.status` nem grava `order_events`

#### Scenario: Mover para etapa sem mapeamento

- **WHEN** um usuário move um pedido para a etapa `embalando`, que não tem status de acompanhamento mapeado
- **THEN** o sistema conclui a movimentação sem exibir nenhuma sugestão de status de cliente
