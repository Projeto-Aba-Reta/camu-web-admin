## 1. Banco de dados

- [x] 1.1 Criar migration `supabase/migrations/<timestamp>_precificacao_margem_por_porte.sql` adicionando a `size_tier_ranges` as colunas `b2c_margin_pct numeric not null default 0`, `b2c_margin_mode text not null default 'somar' check (... in ('somar','substituir'))`, `b2b_margin_pct` e `b2b_margin_mode` com os mesmos defaults/CHECK, com `comment on column` explicando o modo somar/substituir
- [x] 1.2 Na mesma migration, adicionar `price_calculations.effective_b2c_margin jsonb` (nullable — cálculos antigos não têm) com comment explicando que guarda `{ basePct, tierMarginPct, mode, effectivePct }` como snapshot imutável
- [x] 1.3 Confirmar que nenhuma policy de RLS precisa mudar (as colunas novas herdam as policies de `size_tier_ranges` e `price_calculations`) e que os defaults dispensam backfill
- [x] 1.4 Atualizar `supabase/seed-hosted.sql` com margens de exemplo por porte (ex.: P 8% somar, M 12% somar, G 20% somar no B2C), para o simulador ter dados relevantes fora de zero

## 2. Tipos e validação

- [x] 2.1 Em `src/types/pricing.ts`: adicionar `MarginMode = "somar" | "substituir"` e `EffectiveMargin { basePct, tierMarginPct, mode, effectivePct }`; estender `SizeTierRange` com `b2cMarginPct`, `b2cMarginMode`, `b2bMarginPct`, `b2bMarginMode`
- [x] 2.2 Em `src/types/pricing.ts`: estender `B2bPrice` com `effectiveMargin: EffectiveMargin` e `PriceCalculationResult` com `effectiveB2cMargin: EffectiveMargin | null` (null nos registros antigos)
- [x] 2.3 Em `src/types/pricing.ts`: tornar o porte obrigatório na entrada de peça composta — `CalculateCompositePriceInput` ganha `chosenTier: SizeTier`
- [x] 2.4 Em `src/lib/validation/pricing-schemas.ts`: estender `sizeTierRangeFormSchema` com `b2cMarginPctPercent`/`b2bMarginPctPercent` (não-negativos, em %) e `b2cMarginMode`/`b2bMarginMode` (enum), mantendo o padrão de conversão %→fração no componente
- [x] 2.5 Em `src/lib/validation/pricing-schemas.ts`: criar `simuladorFormSchema` (peso, tempo, impressora, `productId` opcional, `chosenTier` opcional) para a peça de exemplo do simulador

## 3. Motor de cálculo (fórmula pura)

- [x] 3.1 Criar `src/lib/services/pricing-formula.ts` e mover para lá, sem alterar comportamento, as funções puras hoje em `pricing-service.ts`: `classifyTier`, `calculateCostBreakdown`, `sumCostBreakdown`, `addWeightedBreakdown`, `calculateChannelPrice`, `calculateB2bPrice` — sem nenhuma dependência de repositório, para poder rodar também no cliente (design, Decisão 4)
- [x] 3.2 Implementar `resolveEffectiveMargin(basePct, tierMarginPct, mode): EffectiveMargin` — `somar` → `basePct + tierMarginPct`; `substituir` → `tierMarginPct` (design, Decisão 2)
- [x] 3.3 Alterar `calculateChannelPrice` e `calculateB2bPrice` para receber `EffectiveMargin` em vez do percentual cru, devolvendo a margem efetiva junto do preço
- [x] 3.4 Implementar `buildFormulaSteps(...)`: descrição estruturada dos passos (operandos e resultado de custo, margem efetiva e preço por canal/faixa) que a UI apenas formata, sem recalcular
- [x] 3.5 Ajustar `src/lib/services/pricing-service.ts` para importar de `pricing-formula.ts` e resolver a margem efetiva a partir da faixa de porte da peça antes de projetar preços B2C e B2B, preenchendo `effectiveB2cMargin` e o `effectiveMargin` de cada `B2bPrice`
- [x] 3.6 Em `calculatePrice`/`calculateAndSavePrice`: quando o porte for ambíguo e o usuário escolher um tier, recalcular os preços com a margem da faixa escolhida (não apenas re-rotular o registro)
- [x] 3.7 Em `calculateCompositePrice`/`calculateAndSaveCompositePrice`: exigir `chosenTier`, lançar erro em português quando ausente, e gravar o porte informado em `suggestedTier` (design, Decisão 3)
- [x] 3.8 Em `resolveComponentCost`: garantir que o cálculo disparado automaticamente para um componente sem cálculo salvo continue funcionando (o componente é peça simples, tem porte classificado automaticamente)

## 4. Repositórios e Server Actions

- [x] 4.1 Mapear as quatro colunas novas em `src/lib/repositories/supabase/supabase-size-tier-range-repository.ts` e na sua interface (leitura e escrita), com fallback para 0/`somar` quando o registro legado vier sem valor
- [x] 4.2 Mapear `effective_b2c_margin` e o `effectiveMargin` das entradas de `b2b_prices` em `src/lib/repositories/supabase/supabase-price-calculation-repository.ts` e na sua interface, tolerando `null` nos registros antigos
- [x] 4.3 Em `src/app/(dashboard)/financeiro/precificacao/actions.ts`: `createSizeTierRangeAction` passa a persistir margens e modos (convertendo % → fração)
- [x] 4.4 Em `src/app/(dashboard)/financeiro/precificacao/actions.ts`: `calculateCompositePriceAction` passa a receber e validar `chosenTier`, retornando erro legível quando ausente

## 5. UI — configuração de precificação

- [x] 5.1 Estender `src/components/precificacao/size-tier-form.tsx` com os campos de margem B2C/B2B (em %) e seus seletores de modo, com texto explicando que `somar` adiciona à margem-alvo e `substituir` a ignora
- [x] 5.2 Exibir margens e modos nas tabelas de faixas vigentes e de histórico do mesmo componente
- [x] 5.3 Criar `PricingDraftProvider` + hook `usePricingDraft` (no-op fora do provider) para os formulários publicarem, via `form.watch()`, os valores em edição sem salvar (design, Decisão 5)
- [x] 5.4 Publicar o rascunho a partir de `parametros-form.tsx`, `canal-fee-form.tsx`, `size-tier-form.tsx` e `b2b-tier-form.tsx`
- [x] 5.5 Criar `src/components/precificacao/simulador-precificacao.tsx`: entrada da peça de exemplo (peso/tempo/impressora, ou peça do catálogo com ficha de fatiamento), escolha de porte quando ambíguo (sem bloquear), fórmula expandida via `buildFormulaSteps` e comparação `Atual → Se salvar` por canal e por faixa de volume
- [x] 5.6 Montar o provider e o simulador em `src/app/(dashboard)/financeiro/precificacao/configuracao/page.tsx`, passando parâmetros vigentes, impressoras e peças com ficha como props do Server Component; o simulador permanece utilizável mesmo quando `canWriteFinanceiro` é falso

## 6. UI — cálculo de preço e peça composta

- [x] 6.1 Em `src/components/shared/resultado-calculo.tsx`: exibir a margem efetiva B2C e sua composição (base + porte, ou porte substituindo), e a margem efetiva de cada faixa B2B, tolerando `null` nos cálculos antigos
- [x] 6.2 Em `src/components/precificacao/calculo-form.tsx`: garantir que a escolha de porte na ambiguidade reexiba os preços recalculados com a nova margem
- [x] 6.3 Em `src/components/catalogo/product-components-manager.tsx`: adicionar o seletor de porte P/M/G, exigido antes de habilitar o botão de calcular o preço do kit, e enviá-lo em `calculateCompositePriceAction`

## 7. Testes

- [x] 7.1 Em `src/lib/services/pricing-service.test.ts`: cobrir `resolveEffectiveMargin` — `somar` (15% + 20% = 35%), `substituir` (20% ignora o alvo) e margem 0 no modo `somar` preservando o preço atual
- [x] 7.2 Cobrir B2C e B2B com modos independentes na mesma faixa de porte (G soma no B2C e substitui no B2B), incluindo a base B2B sendo a margem da faixa de volume e não o alvo B2C
- [x] 7.3 Cobrir a exigência de porte: peça composta sem `chosenTier` falha com erro legível; porte ambíguo resolvido recalcula os preços com a margem do porte escolhido
- [x] 7.4 Cobrir a retrocompatibilidade: faixa de porte legada (margem 0 / `somar`) produz exatamente o preço da suíte anterior à mudança
- [x] 7.5 Ajustar os testes existentes de `pricing-service.test.ts` e `catalog-service.test.ts` que constroem `SizeTierRange` ou chamam o cálculo de composta, para os novos campos e a nova assinatura

## 8. Fechamento

- [x] 8.1 Rodar `npm run lint` e a suíte de testes; corrigir o que quebrar
- [x] 8.2 Aplicar a migration no Supabase de dev e validar o fluxo ponta a ponta: configurar margem por porte, simular antes de salvar, salvar, calcular uma peça simples e uma composta, conferir o snapshot no histórico
- [x] 8.3 Commit seguindo Conventional Commits, ex.: `Feat(financeiro): margem de lucro por faixa de porte e simulador de precificação`
