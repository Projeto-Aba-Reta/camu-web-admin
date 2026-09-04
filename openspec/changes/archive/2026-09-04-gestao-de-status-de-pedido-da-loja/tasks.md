## 1. Dados e serviço (backend)

- [x] 1.1 Criar `OrderTrackingRepository` (Supabase): `listEvents(orderId)`, `updateStatus(orderId, status)`, `insertEvent(orderId, status, note)` — registrar no `createRepositories`
- [x] 1.2 Criar `CUSTOMER_ORDER_STATUSES` (constante) espelhando `src/lib/status.ts` da landing, com comentário apontando o arquivo-par
- [x] 1.3 Criar `OrderTrackingService`: validação de vocabulário, rejeição de status igual ao atual, movimentação livre, montagem da nota com autor
- [x] 1.4 Mapa `STAGE_TO_CUSTOMER_STATUS` (`imprimindo→in_production`, `aguardando_envio→finishing`, `enviado→shipped`) no serviço
- [x] 1.5 Helper de acesso em `src/lib/auth/sales-access.ts`: `canUpdateCustomerStatus` (owner/socio + vendas + producao)
- [x] 1.6 Testes de serviço: vocabulário inválido, status repetido, movimentação pra trás, autor na nota, mapa de etapa

## 2. Server actions

- [x] 2.1 `updateCustomerStatus(orderId, status, note?)` em `src/app/(dashboard)/vendas/actions.ts` — checa permissão, chama o serviço, `revalidatePath`
- [x] 2.2 Estender a action de movimentação de etapa do funil para aceitar `alsoSetCustomerStatus?: string` e aplicá-lo best-effort após a etapa
- [x] 2.3 Registrar autor/instante no log de auditoria de vendas (ou confirmar que a nota basta)

## 3. UI do detalhe do pedido

- [x] 3.1 `page.tsx` (`[orderId]`): carregar `orderTracking.listEvents(order.id)` e `canUpdateCustomerStatus`
- [x] 3.2 `components/vendas/sales-order-detail.tsx`: nova seção "Acompanhamento do cliente" separada da seção de produção — lista de `order_events` (status, nota, data) + estado vazio
- [x] 3.3 Componente de ação "Atualizar status do cliente": select do vocabulário + textarea de nota (rótulo deixa claro que o cliente lê) + submit
- [x] 3.4 Na UI de movimentação de etapa do funil: checkbox "avisar o cliente (status: X)" quando a etapa de destino está no mapa e o status difere

## 4. Deep-link por código

- [x] 4.1 `src/app/(dashboard)/vendas/pedidos/codigo/[orderCode]/page.tsx`: resolve `order_code → id`, `redirect` pro `[orderId]`, `notFound()` quando não existe
- [x] 4.2 Método `findIdByCode(orderCode)` no repositório de pedidos
- [x] 4.3 Verificar que o gate de auth do `[orderId]` cobre o acesso via essa rota

## 5. Specs e fechamento

- [x] 5.1 `openspec validate gestao-de-status-de-pedido-da-loja --strict` verde
- [x] 5.2 Conferência cruzada: vocabulário e rota `/vendas/pedidos/codigo/{code}` batem com a proposta `deep-link-admin-no-pedido` do camu-web-landing-page
- [x] 5.3 `npm run build` / lint / testes verdes
- [x] 5.4 Nota no README/docs de vendas explicando os dois modelos de andamento (funil interno x status do cliente)
