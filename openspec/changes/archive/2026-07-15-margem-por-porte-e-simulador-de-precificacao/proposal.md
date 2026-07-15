## Why

Hoje o motor de precificação aplica uma única margem-alvo B2C (`cost_parameters.target_margin_pct`) e uma margem-alvo por faixa de volume B2B (`b2b_pricing_tiers.target_margin_pct`) a **toda** peça, independentemente do porte. Isso não reflete o negócio: uma peça G ocupa a impressora por horas e imobiliza filamento, enquanto uma P sai em minutos — elas não podem sustentar a mesma margem percentual. As faixas de porte (P/M/G) já existem e já são classificadas automaticamente pelo motor, mas hoje servem apenas de rótulo: não influenciam preço nenhum.

Além disso, o precificador não tem como saber o efeito de uma mudança de parâmetro antes de salvá-la. Como cada submissão cria um registro versionado imutável, hoje a única forma de descobrir que uma margem nova deixou a peça P com preço inviável é salvar o parâmetro e recalcular a peça — sujando o histórico e já valendo para todo mundo.

Domínio afetado: **Financeiro** (precificação) com reflexo em **Produção/catálogo** (classificação de porte passa a ser obrigatória para fechar um cálculo). Sem dependência com o camu-docs.

## What Changes

- Cada faixa de porte (P/M/G) passa a carregar sua própria margem de lucro, configurada separadamente para B2C e para B2B: `margem B2C + modo B2C` e `margem B2B + modo B2B`.
- Cada modo é `somar` ou `substituir`:
  - `somar`: a margem do porte é adicionada à margem-alvo global (B2C) / à margem da faixa de volume (B2B). Ex.: alvo B2C 15% + porte G 20% = 35%.
  - `substituir`: a margem do porte ignora a margem-alvo e vale sozinha. Ex.: porte G substitui a margem de 8% da faixa B2B de 10 unidades por 10%.
- O motor de cálculo passa a resolver a margem efetiva por porte antes de projetar preço por canal (B2C) e preço por faixa de volume (B2B).
- **BREAKING**: nenhum cálculo é salvo sem um porte resolvido. O porte ambíguo (peso e tempo em faixas conflitantes) já exigia escolha manual; agora a **peça composta** — que hoje é calculada sem porte algum (`suggested_tier = null`) — também passa a exigir que o usuário escolha o porte antes de salvar, já que sem porte não existe margem a aplicar.
- Novo simulador na tela de Configuração de precificação: um painel que expande a fórmula de cálculo passo a passo (custo → margem efetiva → taxa de canal → preço) usando as taxas vigentes **e** os valores ainda não salvos que estão sendo digitados nos formulários, sobre uma peça de exemplo informada (peso, tempo, impressora) ou uma peça real do catálogo. Mostra lado a lado o preço com os parâmetros vigentes e o preço que passaria a valer se o formulário fosse salvo. É somente leitura — não grava cálculo no histórico nem parâmetro nenhum.
- Retrocompatibilidade dos dados: faixas de porte existentes assumem margem 0 no modo `somar`, o que preserva exatamente o preço atual (custo × (1 + alvo global)) até que alguém configure uma margem por porte.

## Capabilities

### New Capabilities
- `margem-de-lucro-por-porte`: margem de lucro própria de cada faixa de porte (P/M/G), com modo somar/substituir independente para B2C e para B2B, versionada por vigência junto com a faixa, e a regra de resolução da margem efetiva usada pelo motor.
- `simulador-de-precificacao`: painel de simulação que expõe a fórmula de precificação passo a passo com as taxas vigentes e com valores em edição ainda não salvos, permitindo comparar preço atual × preço projetado sem persistir nada.

### Modified Capabilities
- `motor-de-calculo-de-preco`: o preço por canal (B2C) e o preço por faixa de volume (B2B) passam a usar a margem efetiva resolvida a partir do porte da peça, e não mais a margem-alvo global crua; o cálculo passa a exigir um porte resolvido — inclusive para peça composta, que hoje é calculada com porte nulo.
- `precificacao-por-volume-b2b`: a margem-alvo de uma faixa de volume deixa de ser sempre a margem final aplicada — ela pode ser somada ou substituída pela margem B2B do porte da peça.
- `configuracao-de-precificacao`: a tela de faixas de porte passa a receber margem e modo (B2C e B2B) por faixa, e a tela de configuração ganha o painel de simulação com os valores em edição.
- `calculo-de-preco-por-peca`: o resultado passa a exibir a margem efetiva aplicada e sua origem (porte + modo), e a tela de peça composta passa a exigir a escolha de porte antes de salvar o cálculo.

## Impact

- **Banco**: nova migration em `supabase/migrations/` adicionando quatro colunas a `size_tier_ranges` (`b2c_margin_pct`, `b2c_margin_mode`, `b2b_margin_pct`, `b2b_margin_mode`), com default 0/`somar` para preservar o comportamento atual. `size_tier_ranges` continua versionada por `valid_from` (registros imutáveis), então nenhuma linha existente é reescrita.
- **Motor**: `src/lib/services/pricing-service.ts` — `calculateChannelPrice`/`calculateB2bPrice` passam a receber a margem efetiva; `calculatePrice` resolve o porte antes de projetar preços; `calculateCompositePrice` passa a exigir `chosenTier`. Nova função pura de resolução de margem, exportada para uso do simulador.
- **Tipos e validação**: `src/types/pricing.ts` (`SizeTierRange`, `PriceCalculationResult`, novo `MarginMode`/`EffectiveMargin`), `src/lib/validation/pricing-schemas.ts` (`sizeTierRangeFormSchema` + novo schema do simulador).
- **Repositório**: `src/lib/repositories/supabase/supabase-size-tier-range-repository.ts` e sua interface mapeiam os quatro campos novos.
- **UI**: `src/components/precificacao/size-tier-form.tsx` (margens e modos), novo componente de simulador na tela `src/app/(dashboard)/financeiro/precificacao/configuracao/page.tsx`, `src/components/shared/resultado-calculo.tsx` (exibir margem efetiva), `src/components/catalogo/product-components-manager.tsx` (escolha de porte na peça composta), Server Actions em `src/app/(dashboard)/financeiro/precificacao/actions.ts`.
- **Histórico**: cálculos já salvos não são recalculados nem migrados — permanecem como snapshot do que valia na época, coerente com o requisito de imutabilidade do histórico.
- **Testes**: `src/lib/services/pricing-service.test.ts` cobre resolução de margem por porte (somar/substituir, B2C e B2B), fallback de margem 0 e a exigência de porte resolvido.
