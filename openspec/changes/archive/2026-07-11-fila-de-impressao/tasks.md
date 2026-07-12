## 1. Schema / dados

- [x] 1.1 Criar migration para a tabela `print_queue_items` (product_id FK products, material_id FK materials, quantity, status enum na_fila/imprimindo/concluido/cancelado, printer_id FK printers nullable, started_at, finished_at, created_by, created_at) com RLS seguindo o padrão de `product_stock_movements`/`material_stock_movements`
- [x] 1.2 Adicionar constraint/índice que impeça dois itens `imprimindo` com o mesmo `printer_id` (parcial unique index em `printer_id` filtrando `status = 'imprimindo'`)
- [x] 1.3 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços

- [x] 2.1 Criar `PrintQueueRepository` em `src/lib/repositories` (create, listByStatus, findById, updateStatus/printer/timestamps)
- [x] 2.2 Criar `SlackNotificationService` (novo) com um método de envio de mensagem via `SLACK_WEBHOOK_URL`, sem lançar erro em caso de falha (apenas log)
- [x] 2.3 Criar `PrintQueueService` em `src/lib/services` com métodos `addToQueue`, `startPrinting` (calcula impressora ociosa sugerida, valida exclusividade), `completePrinting` (gera movimentações via `InventoryService` + chama `SlackNotificationService`), `cancel`
- [x] 2.4 Implementar RBAC (escrita: owner/socio/role producao; leitura adicional: role financeiro) seguindo o padrão de `parque-de-impressoras`
- [x] 2.5 Adicionar `SLACK_WEBHOOK_URL` a `.env.example` com comentário explicando o formato (Incoming Webhook do Slack)
- [x] 2.6 Testes unitários do `PrintQueueService` (início com impressora ociosa, rejeição de impressora ocupada, conclusão gerando as duas movimentações, cancelamento sem movimentação, falha de Slack não bloqueando conclusão)

## 3. UI

- [x] 3.1 Nova rota `/producao/fila-de-impressao` com listagem dos itens agrupados por status (na fila / imprimindo / concluído)
- [x] 3.2 Formulário "Adicionar à fila" (seleção de produto do catálogo já com cálculo vinculado, quantidade, material/cor de filamento)
- [x] 3.3 Ação de play por item, com modal de seleção de impressora (impressora ociosa pré-selecionada quando houver exatamente uma)
- [x] 3.4 Ação de concluir por item (com confirmação, exibindo o resumo do que será baixado do estoque)
- [x] 3.5 Ação de cancelar por item
- [x] 3.6 Nova entrada de navegação para a fila de impressão dentro da área de Produção
