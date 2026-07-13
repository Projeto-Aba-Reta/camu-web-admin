## 1. Parâmetros de custo (dado, sem schema novo)

- [x] 1.1 Atualizar `scripts/seed-pricing.ts` com filamento R$130/kg e energia R$0,80/kWh (manter embalagem R$3 e reserva de falha 12,5% até nova instrução)
- [ ] 1.2 Registrar, via tela de configuração já existente (ou script), um novo `cost_parameters` vigente com os valores acima em ambiente de homologação/produção — ação de deploy/operação, não de código; pendente de execução em homologação/produção reais.

## 2. Schema (migrations aditivas)

- [x] 2.1 Migration: adicionar `target_margin_pct numeric not null default 0` em `cost_parameters`
- [x] 2.2 Migration: adicionar `product_type text not null default 'simples' check (product_type in ('simples','composta'))` em `products`
- [x] 2.3 Migration: criar tabela `product_components` (`parent_product_id`, `component_product_id`, `quantity`, `created_by`, `created_at`) com FK para `products` e `check (quantity > 0)`
- [x] 2.4 Migration: criar tabela `b2b_pricing_tiers` (`min_quantity`, `target_margin_pct`, `valid_from`, `created_by`) versionada, seguindo o mesmo padrão de `channel_fees`
- [x] 2.5 Definir e aplicar RLS policies de `product_components` e `b2b_pricing_tiers` conforme as specs `composicao-de-produto` e `precificacao-por-volume-b2b`

## 3. Tipos e repositórios

- [x] 3.1 Atualizar `src/types/pricing.ts`: `CostParameters.targetMarginPct`, novo tipo `B2bPricingTier`, `PriceCalculationInput.slicingSheetId?`, `PriceCalculationResult` com `b2bPrices`
- [x] 3.2 Atualizar `src/types/catalog.ts`: `Product.productType`, novo tipo `ProductComponent`
- [x] 3.3 Criar `src/lib/repositories/interfaces/b2b-pricing-tier-repository.interface.ts` + `src/lib/repositories/supabase/supabase-b2b-pricing-tier-repository.ts` (`findAllCurrent`, `create`)
- [x] 3.4 Criar `src/lib/repositories/interfaces/product-component-repository.interface.ts` + `src/lib/repositories/supabase/supabase-product-component-repository.ts` (`findByParentId`, `create`, `remove`)
- [x] 3.5 Atualizar `src/lib/repositories/interfaces/cost-parameter-repository.interface.ts` e a implementação Supabase para incluir `targetMarginPct`

## 4. Motor de cálculo (`pricing-service.ts`)

- [x] 4.1 Tornar `weightGrams`/`printHours` opcionais em `PriceCalculationInput` quando a peça tiver ficha de fatiamento cadastrada para a impressora; resolver peso (soma de `pieceGrams`) e tempo a partir da `SlicingSheet` correspondente
- [x] 4.2 Adicionar `targetMarginPct` à fórmula de `calculateChannelPrice` (`(custo × (1 + margem)) ÷ (1 - taxa%) + taxa fixa`), com `0` preservando o comportamento atual
- [x] 4.3 Implementar `calculateCompositePrice`: para peça `composta`, buscar `product_components`, resolver o custo de cada componente (cálculo mais recente salvo, ou calcular na hora via ficha de fatiamento se ausente) e agregar `CostBreakdown` × quantidade
- [x] 4.4 Implementar cálculo de preço B2B por faixa (`custo_total × (1 + margem-alvo da faixa)`, sem taxa de canal), incluído no resultado ao lado dos preços por canal
- [x] 4.5 Validar ausência de ciclos ao criar um vínculo em `product_components` (percorrer a árvore de componentes antes de persistir) — implementado em `CatalogService.addComponent` (ver grupo 5), não em `pricing-service.ts`: é a camada de escrita do vínculo, não de cálculo.
- [x] 4.6 Validar que um componente só pode ser adicionado se já tiver ficha de fatiamento ou `price_calculation_id` — implementado em `CatalogService.addComponent`, mesmo racional do item acima.

## 5. Catálogo — composição de produto

- [x] 5.1 Atualizar `src/lib/services/catalog-service.ts` com `listComponents`/`addComponent`/`removeComponent`, incluindo validação de ciclo e de custo conhecido
- [x] 5.2 Expor no serviço de catálogo o custo agregado calculado (via `PricingService.calculateCompositePrice`) para exibição no cadastro da peça composta — consumido diretamente pela UI (grupo 8) via Server Action dedicada

## 6. UI — configuração de precificação

- [x] 6.1 Atualizar `src/components/precificacao/parametros-form.tsx` para incluir o campo de margem-alvo B2C
- [x] 6.2 Adicionar nova seção/formulário de faixas B2B (quantidade mínima + margem-alvo) na tela de configuração de precificação, com histórico versionado — `src/components/precificacao/b2b-tier-form.tsx`
- [x] 6.3 Aplicar a mesma regra de acesso (`owner`/`socio`/`financeiro` escreve, `producao` só lê) aos novos campos e à nova seção — reaproveita `canWriteFinanceiroParams` já existente

## 7. UI — cálculo de preço por peça

- [x] 7.1 Atualizar `src/components/precificacao/calculo-form.tsx` para, ao selecionar peça + impressora com ficha de fatiamento cadastrada, oferecer usar peso/tempo da ficha em vez de digitar manualmente
- [x] 7.2 Exibir tabela de preço B2B por faixa de volume ao lado da tabela de preço por canal no resultado do cálculo — `resultado-calculo.tsx`
- [x] 7.3 Para peça `composta`, exibir o breakdown de custo por componente (nome, quantidade, custo) além do total agregado — `resultado-calculo.tsx`

## 8. UI — catálogo (peça composta)

- [x] 8.1 Adicionar seleção de tipo de peça (`simples`/`composta`) no formulário de cadastro/edição de peça
- [x] 8.2 Para peça `composta`, adicionar interface de gestão de componentes (buscar peça existente, definir quantidade, remover), bloqueando a inclusão de componente sem custo conhecido com mensagem explicativa — `src/components/catalogo/product-components-manager.tsx`
- [x] 8.3 Exibir alerta não bloqueante quando o cálculo de uma peça composta gerar automaticamente um novo cálculo para um componente órfão (sem cálculo salvo prévio)

## 9. Testes

- [x] 9.1 Testes unitários de `pricing-service.test.ts`: margem-alvo aplicada e com valor zero preservando comportamento atual; cálculo a partir de ficha de fatiamento; `calculateCompositePrice` com múltiplos componentes; preço B2B por faixa
- [x] 9.2 Testes de validação de ciclo em `product_components` e de bloqueio de componente sem custo conhecido — `catalog-service.test.ts`
- [ ] 9.3 Testes de RLS das novas tabelas (`product_components`, `b2b_pricing_tiers`) por role — **bloqueado**: este repositório não tem nenhuma infraestrutura de teste de RLS/pgTAP (nenhum precedente em `supabase/` ou `src/`); introduzir esse harness do zero é um escopo à parte, fora desta mudança. As policies foram escritas espelhando exatamente o padrão já usado (e não testado automaticamente) por `channel_fees`/`products`.

## 10. Fechamento

- [ ] 10.1 Confirmar com Felipe se o custo do Leon Judoca (R$17,72) já inclui energia/depreciação, antes de cadastrar essa peça com os novos parâmetros
- [ ] 10.2 Cadastrar a composição real da Caixa Mandala no catálogo (decágono + cunhas + travas), após confirmar a contagem de travas do encaixe
- [ ] 10.3 Atualizar o brief da Caixa Mandala no `camu-docs` com os custos reais recalculados após esta mudança entrar no ar
