## 1. Schema / dados

- [x] 1.1 Migration: criar `product_slicing_sheets` (`product_id` FK `products`, `printer_id` FK `printers`, `print_hours` numeric, `created_by`, `created_at`, `updated_at`) com `unique(product_id, printer_id)` e RLS seguindo o padrão de `catalogo-de-pecas`/`materials`
- [x] 1.2 Migration: criar `product_slicing_sheet_materials` (`slicing_sheet_id` FK `product_slicing_sheets` on delete cascade, `material_id` FK `materials`, `piece_grams` numeric, `support_grams` numeric default 0) com RLS via referência ao pai
- [x] 1.3 Migration: alterar `print_queue_items` — remover coluna `material_id`, adicionar `expected_finish_at timestamptz null`
- [x] 1.4 Migration: criar `print_queue_item_materials` (`print_queue_item_id` FK `print_queue_items` on delete cascade, `material_id` FK `materials`, `piece_grams` numeric, `support_grams` numeric) — snapshot da ficha copiado no início da impressão, com RLS seguindo o mesmo padrão de leitura/escrita de `print_queue_items`
- [x] 1.5 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços — ficha de fatiamento

- [x] 2.1 Criar `SlicingSheetRepository` em `src/lib/repositories` (`findByProductId`, `findByProductAndPrinter`, `upsert` — substitui as linhas de material por completo ao reeditar, `delete`)
- [x] 2.2 Criar `SlicingSheetService` em `src/lib/services` com `upsertSheet` (valida pelo menos uma linha de material) e `listByProduct` (retorna peso total derivado por ficha)
- [x] 2.3 RBAC: reaproveitar `canAccessCatalog`/`canWriteCatalog`/`requireCatalogAccess`/`requireCatalogWrite` de `src/lib/auth/catalog-access.ts` (mesma regra da tela onde a ficha vive — evita um terceiro guard duplicado, ver design.md)
- [x] 2.4 Testes unitários do `SlicingSheetService` (peso derivado da soma de `piece_grams`, substituição completa das linhas ao reeditar, rejeição de ficha sem nenhuma linha de material)

## 3. Backend / serviços — adaptar fila de impressão para múltiplos materiais

- [x] 3.1 Atualizar `PrintQueueRepository`: remover `materialId` de `CreatePrintQueueItemInput`; adicionar métodos para o snapshot de materiais do item (`setItemMaterials`/`findMaterialsByItemId`) e para persistir `expected_finish_at`
- [x] 3.2 Atualizar `PrintQueueService.addToQueue`: remover parâmetro `materialId`; validar que o produto tem pelo menos uma ficha de fatiamento cadastrada (substitui a checagem antiga de `priceCalculationId`)
- [x] 3.3 Atualizar `PrintQueueService.listPrinterAvailability`/`startPrinting`: restringir impressoras candidatas às que têm ficha de fatiamento para o produto do item; ao iniciar com sucesso, copiar as linhas de material da ficha para `print_queue_item_materials` e calcular `expected_finish_at` (`started_at` + tempo da ficha)
- [x] 3.4 Atualizar `PrintQueueService.completePrinting`: gerar uma movimentação `consumo_producao` por linha de material snapshotada (peça + suporte, multiplicada pela quantidade do item), em vez de uma única movimentação
- [x] 3.5 Adicionar `PrintQueueService.completeExpiredPrintings()`: busca itens `imprimindo` com `expected_finish_at <= now()` e chama `completePrinting` para cada um
- [x] 3.6 Atualizar testes unitários do `PrintQueueService` (conclusão gera uma movimentação por material da ficha; início rejeita impressora sem ficha cadastrada para o produto; `completeExpiredPrintings` conclui apenas itens vencidos e ignora os dentro do prazo)

## 4. Rotina de conclusão automática (cron)

- [x] 4.1 Criar rota `POST /api/cron/complete-print-queue`, protegida por `Authorization: Bearer <CRON_SECRET>`, chamando `PrintQueueService.completeExpiredPrintings()` com um cliente Supabase de service role
- [x] 4.2 Adicionar `CRON_SECRET` a `.env.example` com comentário explicando o uso
- [x] 4.3 Adicionar `vercel.json` com um `crons` de exemplo (a cada 5 minutos) apontando para a rota acima, deixando claro que outro agendador (ex. GitHub Actions) pode chamar a mesma rota em seu lugar
- [x] 4.4 Teste da rota (rejeita requisição sem o segredo correto; a lógica de conclusão em si já é coberta pelos testes de `PrintQueueService.completeExpiredPrintings`)

## 5. UI — Ficha de fatiamento

- [x] 5.1 Nova seção "Ficha de fatiamento" na tela de detalhe da peça (`/producao/catalogo/[productId]`), listando as fichas já cadastradas por impressora
- [x] 5.2 Formulário de cadastro/edição de ficha (seleção de impressora ativa, lista dinâmica de linhas material + gramas na peça + gramas em suporte, tempo de impressão), exibindo o peso total derivado
- [x] 5.3 Exibir peso total e tempo de impressão por impressora na listagem de fichas da peça

## 6. UI — Fila de impressão

- [x] 6.1 Atualizar formulário "Adicionar à fila": remover seleção manual de material; bloquear a adição com aviso quando o produto não tiver nenhuma ficha de fatiamento cadastrada
- [x] 6.2 Atualizar modal de "Iniciar impressão": listar apenas impressoras com ficha de fatiamento cadastrada para o produto do item
- [x] 6.3 Atualizar diálogo de conclusão manual para exibir o resumo de múltiplos materiais a serem baixados (uma linha por material da ficha)
- [x] 6.4 Adicionar cronômetro regressivo por item `imprimindo`, calculado a partir de `expected_finish_at` e atualizado localmente via `setInterval`, com polling leve para refletir a conclusão automática assim que ela ocorrer no servidor
