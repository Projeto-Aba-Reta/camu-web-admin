## 1. Pré-requisito: confirmar dependências de dados (backend/dados)

- [x] 1.1 Confirmar no banco os slugs reais das roles `financeiro` e `producao` criadas pelo seed de `fundacao-admin-roles-usuarios` (ajustar policies deste change se os slugs forem diferentes)
- [x] 1.2 Confirmar com o Owner/Sócio o valor de referência do custo de embalagem (não fixado em `custo-por-peca.md`) e o percentual bruto real da comissão do Mercado Livre (a tabela do doc já desconta ~14% no preço sugerido, mas não deixa claro se é a taxa bruta da categoria)

## 2. Schema de parâmetros e parque de impressoras (backend/dados)

- [x] 2.1 Migration: criar tabela `cost_parameters` (`id`, `filament_cost_per_kg`, `energy_cost_per_kwh`, `average_power_watts`, `failure_reserve_pct`, `packaging_cost`, `valid_from`, `created_by`)
- [x] 2.2 Migration: criar tabela `printers` (`id`, `name`, `model`, `depreciation_per_hour`, `is_active`, `valid_from`, `created_by`)
- [x] 2.3 Migration: criar tabela `channel_fees` (`id`, `channel` com CHECK constraint dos 5 canais, `percentage_fee`, `fixed_fee`, `valid_from`, `created_by`)
- [x] 2.4 Migration: criar tabela `size_tier_ranges` (`id`, `tier` CHECK P/M/G, `min_weight_grams`, `max_weight_grams`, `min_print_hours`, `max_print_hours`, `valid_from`)
- [x] 2.5 Migration: criar tabela `price_calculations` (`id`, `weight_grams`, `print_hours`, `printer_id`, `cost_parameters_id`, `suggested_tier`, `total_cost`, `cost_breakdown jsonb`, `channel_prices jsonb`, `created_by`, `created_at`)
- [x] 2.6 Migration: índices `(valid_from desc)` em `cost_parameters`, `printers`, `channel_fees`, `size_tier_ranges`
- [x] 2.7 Migration: habilitar RLS nas 5 tabelas e criar policies conforme `design.md` (leitura Owner/Sócio/Financeiro/Produção; escrita restrita por tabela)
- [x] 2.8 Gerar tipos TypeScript do schema (`npm run db:types`)

## 3. Seed de valores de referência do camu-docs (backend/dados)

- [x] 3.1 Criar `scripts/seed-pricing.ts` (idempotente, via services/repositórios) com 1 registro de `cost_parameters` (filamento R$90/kg, energia R$0,80/kWh, 150W, reserva 12,5%, embalagem confirmada na task 1.2)
- [x] 3.2 Seed de `printers`: Ender-3 V3 SE (depreciação R$0,80/h)
- [x] 3.3 Seed de `size_tier_ranges`: P (~15g/~2,1h), M (~35g/~4,2h), G (~80g/~8,4h), com folga de faixa (min/max) documentada no script
- [x] 3.4 Seed de `channel_fees` para os 5 canais, com percentual confirmado na task 1.2 e placeholder explícito nos demais até validação real no seller center de cada plataforma
- [x] 3.5 Adicionar script `seed-pricing` no `package.json`, documentado no README como uso recomendado só em ambiente local

## 4. Camada de repositórios e services (backend/dados)

- [x] 4.1 Definir interfaces em `src/lib/repositories/interfaces/`: `cost-parameter-repository.interface.ts`, `printer-repository.interface.ts`, `channel-fee-repository.interface.ts`, `size-tier-range-repository.interface.ts`, `price-calculation-repository.interface.ts`
- [x] 4.2 Implementar as 5 interfaces em `src/lib/repositories/supabase/`, cada uma buscando o registro vigente por `valid_from`
- [x] 4.3 Registrar as novas implementações na composition root `src/lib/repositories/index.ts`
- [x] 4.4 Criar `src/types/pricing.ts` com os tipos compartilhados (`CostParameters`, `Printer`, `ChannelFee`, `SizeTierRange`, `PriceCalculationResult`)
- [x] 4.5 Criar `src/lib/services/pricing-service.ts` com `calculatePrice()` (função pura) e `calculateAndSavePrice()` (persiste em `price_calculations`)
- [x] 4.6 Implementar a lógica de classificação de porte com sinalização de ambiguidade quando peso e tempo caem em faixas diferentes

## 5. Verificação

- [x] 5.1 Testes unitários de `pricing-service.ts`: cálculo de custo para os 3 exemplos de referência (P/M/G) batendo com os valores aproximados de `custo-por-peca.md`
- [x] 5.2 Teste unitário: alteração de um parâmetro de custo não afeta cálculos já persistidos em `price_calculations`
- [x] 5.3 Rodar `npm run seed-pricing` duas vezes seguidas em um banco local e confirmar ausência de duplicatas
- [x] 5.4 Testar manualmente via Supabase Studio local: usuário com role `producao` consegue ler mas não escrever em `cost_parameters`; usuário sem role `financeiro`/`producao` não consegue ler nenhuma das 5 tabelas
