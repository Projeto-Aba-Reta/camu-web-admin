## Why

Hoje o porte de uma peça é um conjunto fechado de três valores — P, M e G — cravado no código como o tipo `SizeTier = "P" | "M" | "G"` e reforçado por `CHECK (tier in ('P','M','G'))` em duas tabelas do banco (`size_tier_ranges.tier` e `products.size_tier`). Isso não acompanha o catálogo: a Camu já tem peças que não cabem nessa régua de três degraus (um chaveiro minúsculo e uma miniatura de 15g dividem a faixa P; uma caixa grande e um vaso enorme dividem a G), e não há como criar um "GG" ou um "PP" sem alterar código e migração.

Como a margem de lucro agora é resolvida por porte (mudança `margem-por-porte-e-simulador-de-precificacao`), essa rigidez pesa mais: cada porte novo que o negócio quisesse precificar de forma diferente exige um deploy. Abrir o cadastro de portes tira essa decisão comercial do código e a devolve para a tela de configuração — onde as faixas de peso/tempo e as margens já são cadastradas.

Domínio afetado: **Produção/catálogo** (classificação e rótulo de porte da peça) e **Financeiro** (faixas de porte alimentam custo, margem e preço). Sem dependência com o camu-docs.

## What Changes

- O porte deixa de ser um enum fixo P/M/G e passa a ser uma lista cadastrável. P, M e G continuam existindo como portes de sistema (sempre presentes, criados pelo seed), e o usuário pode cadastrar portes personalizados **além** deles (ex.: PP, GG, XG).
- Cada porte passa a ter um **código curto estável** (o que peças e cálculos guardam, ex.: `GG`) e um **nome de exibição** editável (ex.: "Extra Grande"), além de uma **ordem explícita** que posiciona o porte na régua de tamanho.
- O cadastro de faixa de porte (peso/tempo + margens B2C/B2B, já existentes) passa a aceitar um porte novo pelo código, em vez de escolher só entre P/M/G num dropdown fixo.
- A classificação automática de porte e o tratamento de ambiguidade passam a operar sobre a lista dinâmica de portes, ordenada pela ordem cadastrada, em vez da sequência fixa P<M<G.
- **BREAKING (interno)**: o tipo `SizeTier` deixa de ser a união literal `"P" | "M" | "G"` e passa a ser `string` (um código de porte). Nenhuma peça ou cálculo existente muda de valor — P/M/G continuam válidos —, mas todo código que assumia exatamente três portes (rótulos fixos, ordenação fixa) passa a resolver rótulo e ordem a partir dos portes cadastrados.
- Portes de sistema (P/M/G) não podem ser removidos nem ter o código alterado, para não invalidar peças e cálculos que já os referenciam; seu nome de exibição e suas faixas/margens continuam editáveis.

## Capabilities

### New Capabilities
- `portes-personalizados`: cadastro e versionamento de portes de tamanho além dos fixos P/M/G — código estável, nome de exibição, ordem na régua de tamanho —, com portes de sistema protegidos contra remoção/renomeação de código e portes personalizados livres.

### Modified Capabilities
- `motor-de-calculo-de-preco`: a classificação automática de porte e a sinalização de ambiguidade passam a considerar a lista dinâmica de portes cadastrados, ordenada pela ordem definida, em vez do conjunto fixo P/M/G.
- `configuracao-de-precificacao`: a tela de faixas de porte passa a permitir cadastrar portes personalizados (código + nome + ordem), além de editar peso/tempo/margens, e exibe o nome de cada porte junto do código.
- `catalogo-de-pecas`: o porte de uma peça passa a poder ser qualquer porte cadastrado, não só P/M/G, exibindo o nome de exibição do porte no catálogo.

## Impact

- **Banco**: nova migration em `supabase/migrations/`. Remove os dois `CHECK (... in ('P','M','G'))` (`size_tier_ranges.tier`, `products.size_tier`). Introduz o registro de portes com código/nome/ordem e a proteção dos portes de sistema — provavelmente uma tabela `size_tiers` (código PK, nome, ordem, flag de sistema) referenciada logicamente pelo código, mantendo `size_tier_ranges`/`products.size_tier` guardando o código como texto (decisão a detalhar no design). Sem reescrever linhas existentes: P/M/G viram registros de sistema no seed/na migration.
- **Tipos**: `src/types/pricing.ts` (`SizeTier` vira `string`; novo tipo de definição de porte), `src/types/catalog.ts`.
- **Motor e classificação**: `src/lib/services/pricing-formula.ts` (`classifyTier`/`TIER_ORDER` passam a receber os portes ordenados), `src/lib/services/pricing-service.ts`, serialização de ambiguidade em `supabase-price-calculation-repository.ts` (o separador `/` precisa ser seguro para códigos personalizados).
- **Repositórios**: novo repositório de portes (interface + implementação Supabase); `supabase-size-tier-range-repository.ts` e `supabase-product-repository.ts` deixam de assumir P/M/G.
- **Validação**: `src/lib/validation/pricing-schemas.ts` (o enum `SIZE_TIERS` fixo dá lugar a validação de código de porte contra os cadastrados; formato do código).
- **UI**: `size-tier-form.tsx` (cadastro de porte custom + edição), `resultado-calculo.tsx`, `simulador-precificacao.tsx`, `historico-tabela.tsx`, `product-components-manager.tsx`, `calculo-form.tsx`, e os rótulos fixos `TIER_LABEL`/`SIZE_TIER_LABEL` em `components/catalogo/constants.ts` e demais componentes passam a resolver o nome a partir dos portes cadastrados.
- **Seed**: `supabase/seed-hosted.sql` e `scripts/seed-pricing.ts` registram P/M/G como portes de sistema com nome e ordem.
- **Histórico**: cálculos e peças já salvos permanecem intactos (guardam o código do porte, que continua válido); nenhum recálculo ou migração de dados de negócio.
- **Testes**: `pricing-service.test.ts` (classificação sobre lista dinâmica, portes custom, ambiguidade com códigos novos), testes de catálogo que assumem P/M/G.
