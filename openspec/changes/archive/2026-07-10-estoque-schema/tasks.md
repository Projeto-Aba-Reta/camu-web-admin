## 1. Pré-requisito (backend/dados)

- [x] 1.1 Confirmar no banco os slugs reais das roles `producao` e `financeiro`, ajustando as policies deste change se divergirem

## 2. Schema de estoque de insumos (backend/dados)

- [x] 2.1 Migration: criar tabela `materials` (`id`, `name`, `type`, `unit`, `reference_cost`, `created_by`, timestamps)
- [x] 2.2 Migration: criar tabela `material_stock_movements` (`id`, `material_id`, `quantity`, `movement_type` CHECK, `printer_id` nullable, `product_id` nullable, `notes`, `created_by`, `created_at`)
- [x] 2.3 Migration: criar view/função `material_stock_balances` (saldo derivado por `SUM(quantity)` agrupado por `material_id`)
- [x] 2.4 Migration: criar tabela `material_stock_thresholds` (`id`, `material_id unique`, `minimum_quantity`, `updated_by`, `updated_at`)
- [x] 2.5 Migration: habilitar RLS em `materials`, `material_stock_movements`, `material_stock_thresholds` conforme `design.md`

## 3. Schema de estoque de peças prontas (backend/dados)

- [x] 3.1 Migration: criar tabela `product_stock_movements` (`id`, `product_id`, `quantity`, `movement_type` CHECK, `material_stock_movement_id` nullable, `notes`, `created_by`, `created_at`)
- [x] 3.2 Migration: criar view/função `product_stock_balances` (saldo derivado por `SUM(quantity)` agrupado por `product_id`)
- [x] 3.3 Migration: habilitar RLS em `product_stock_movements` conforme `design.md`
- [x] 3.4 Gerar tipos TypeScript do schema (`npm run db:types`)

## 4. Camada de repositórios e services (backend/dados)

- [x] 4.1 Definir interfaces em `src/lib/repositories/interfaces/`: `material-repository.interface.ts`, `material-stock-movement-repository.interface.ts`, `material-stock-threshold-repository.interface.ts`, `product-stock-movement-repository.interface.ts`
- [x] 4.2 Implementar as 4 interfaces em `src/lib/repositories/supabase/`
- [x] 4.3 Registrar as novas implementações na composition root `src/lib/repositories/index.ts`
- [x] 4.4 Criar `src/types/inventory.ts` com os tipos compartilhados
- [x] 4.5 Criar `src/lib/services/inventory-service.ts`: registrar movimentação de insumo, registrar movimentação de peça pronta (com vínculo opcional transacional entre as duas), consultar saldo/alerta

## 5. Seed opcional (backend/dados)

- [x] 5.1 Criar `scripts/seed-inventory.ts` (idempotente) com o material "Filamento PLA genérico" e uma movimentação de compra de 3kg (referência de `investimento-inicial.md`)
- [x] 5.2 Adicionar script `seed-inventory` no `package.json`

## 6. Verificação

- [x] 6.1 Teste unitário: saldo derivado bate com a soma manual de um conjunto de movimentações de teste
- [x] 6.2 Teste unitário: insumo sem limite configurado nunca aparece como estoque baixo
- [x] 6.3 Teste unitário: registrar consumo de insumo com opção de gerar peça pronta cria as duas movimentações vinculadas na mesma transação
- [x] 6.4 Testar manualmente via Supabase Studio local: usuário com role `financeiro` consegue ler saldo e alertas, mas não registrar movimentação nem configurar limite
