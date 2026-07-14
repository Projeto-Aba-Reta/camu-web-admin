## 1. Repositórios: contagem de dependências

- [x] 1.1 Adicionar `countByProductId(productId: string): Promise<number>` a `IPrintQueueRepository` e implementar em `SupabasePrintQueueRepository` (count sobre `print_queue_items`, sem carregar linhas)
- [x] 1.2 Adicionar `countByProductId` a `IProductStockMovementRepository` e implementar em `SupabaseProductStockMovementRepository`
- [x] 1.3 Adicionar `countByProductId` a `IMaterialStockMovementRepository` e implementar em `SupabaseMaterialStockMovementRepository` (a coluna `product_id` é nullable)
- [x] 1.4 Adicionar `findByComponentProductId(productId: string): Promise<ProductComponent[]>` a `IProductComponentRepository` e implementar em `SupabaseProductComponentRepository` — a lista (não só a contagem) alimenta a mensagem "usada como componente de X"

## 2. CatalogService: regra de exclusão

- [x] 2.1 Definir o tipo `ProductDependencies` (`printQueueItems`, `productStockMovements`, `materialStockMovements`, `usedAsComponentIn`) e o helper `hasBlockingDependencies(deps)` em `catalog-service.ts`
- [x] 2.2 Implementar `CatalogService.getProductDependencies(productId)` resolvendo as quatro consultas em paralelo com `Promise.all`
- [x] 2.3 Implementar `CatalogService.deleteProduct(productId, storage)` na ordem da decisão 3 do design: checar dependências → recusar com erro explicativo se houver bloqueio → remover objetos do bucket `product-media` → `products.delete()`
- [x] 2.4 Implementar `CatalogService.discontinueProduct(productId)` como `updateProduct(id, { status: "descontinuado" })`
- [x] 2.5 Cobrir em `catalog-service.test.ts`: exclusão de peça sem histórico (remove mídia/canais/ficha em cascata e limpa o Storage); bloqueio por item na fila; bloqueio por movimentação de estoque; bloqueio por uso como componente; falha do Storage aborta antes do `delete` no banco

## 3. Server Actions

- [x] 3.1 Implementar `deleteProductAction(productId)` em `producao/catalogo/actions.ts`, com `requireCatalogWrite()`, chamando `CatalogService.deleteProduct` e revalidando `/producao/catalogo`
- [x] 3.2 Implementar `discontinueProductAction(productId)` com `requireCatalogWrite()`, revalidando a listagem e o detalhe da peça
- [x] 3.3 Garantir que o erro de FK vindo do banco (janela entre checagem e delete — ver Riscos do design) seja capturado e devolvido como mensagem legível, não como erro de constraint em cru

## 4. UI: diálogo de exclusão

- [x] 4.1 Criar `src/components/catalogo/delete-product-dialog.tsx` seguindo o padrão de `admin/delete-role-dialog.tsx` (AlertDialog + `useTransition` + `toast` + `router.refresh()`), controlado e sem trigger próprio, carregando a checagem ao abrir via `getProductDeletionCheckAction`
- [x] 4.2 Ramo sem dependências: confirmação de exclusão permanente, listando o que será removido em cascata (N fotos, N canais, N fichas de fatiamento)
- [x] 4.3 Ramo com dependências: não oferecer excluir; explicar os vínculos que bloqueiam (fila, estoque, peças compostas que a usam, nomeando-as) e oferecer o botão "Descontinuar peça" — omitido se a peça já estiver `descontinuado`
- [x] 4.4 Callback `onCompleted("deleted" | "discontinued")`: a listagem apenas atualiza; o detalhe redireciona para `/producao/catalogo` só quando a peça foi de fato excluída (descontinuar preserva a rota)

## 5. UI: ações na listagem e no detalhe

- [x] 5.1 Em `product-list.tsx`, adicionar coluna de ações com `DropdownMenu`: Ver detalhes, Editar e Excluir, com `stopPropagation` no trigger para não disparar a navegação da linha
- [x] 5.2 Condicionar o menu à permissão: sem `canWrite`, exibir apenas Ver detalhes — o que exige passar `canWrite` de `catalogo/page.tsx` para `ProductList` (hoje o componente não recebe essa prop)
- [x] 5.3 Renderizar o diálogo fora da tabela, montado só quando há peça selecionada (`key={product.id}`): um `AlertDialogTrigger` dentro do `DropdownMenu` seria desmontado junto com o menu. A checagem de vínculos é carregada ao abrir, não para a listagem inteira (ver design.md decisão 4)
- [x] 5.4 Em `catalogo/[productId]/page.tsx`, adicionar as ações de excluir/descontinuar no `PageHeader` para usuários com escrita, via `ProductDetailActions`, reaproveitando o mesmo diálogo

## 6. Verificação

- [x] 6.1 Rodar lint, typecheck e a suíte de testes
- [x] 6.2 Validar a premissa das guardas contra o banco real (Supabase local): as 9 FKs que referenciam `products` conferem com o design (3 `cascade` + `parent_product_id`, `component_product_id` `restrict`, fila e estoque `no action`, `price_calculations` `set null`); `DELETE` de peça sem histórico funciona e cascateia mídia/canais para zero; `DELETE` de peça com item na fila é bloqueado com `23503`, o código que `isForeignKeyViolation` trata
- [ ] 6.3 Click-through na aplicação (pendente — exige sessão autenticada no browser): excluir um rascunho e confirmar que os arquivos somem do bucket `product-media`; abrir o diálogo numa peça que está na fila e confirmar o bloqueio + botão "Descontinuar peça"; abrir a listagem com usuário somente leitura (ex.: role `financeiro`) e confirmar que o menu só mostra "Ver detalhes"
