## Context

O motor de precificação (`src/lib/services/pricing-service.ts`) hoje faz:

- **Custo**: filamento + energia + depreciação + reserva de falha + embalagem.
- **Porte**: `classifyTier(peso, tempo, faixas)` → `P | M | G`, ou ambíguo quando peso e tempo apontam faixas diferentes. Peça composta não é classificada (`suggestedTier = null`).
- **Preço B2C por canal**: `custo × (1 + targetMarginPct global) ÷ (1 − taxa%) + taxa fixa`.
- **Preço B2B por faixa de volume**: `custo × (1 + margem da faixa)`, sem taxa de canal.

O porte, portanto, é hoje um rótulo: classifica, aparece no resultado, é filtrável no histórico — e não entra em nenhuma conta. As duas margens que existem (`cost_parameters.target_margin_pct` e `b2b_pricing_tiers.target_margin_pct`) são globais em relação ao porte.

Restrições que o desenho precisa respeitar:

- **Todos os parâmetros de precificação são imutáveis e versionados por `valid_from`** (`cost_parameters`, `channel_fees`, `size_tier_ranges`, `b2b_pricing_tiers`). Nenhum registro é reescrito; "vigente" é o de `valid_from` mais recente.
- **`price_calculations` é um snapshot imutável.** Cálculos antigos não podem ser recalculados nem migrados: eles registram o que valia na época (Requirement "Persistência do histórico de cálculos").
- O formulário trabalha em **%** (ex.: `20`); o banco e o motor guardam **fração** (`0.20`). A conversão acontece no componente, antes da Server Action — padrão já usado por `failureReservePct` e `percentageFee`.

## Goals / Non-Goals

**Goals:**

- Cada faixa de porte carrega margem própria para B2C e para B2B, cada uma com seu modo (`somar` ao alvo global / `substituir` o alvo global).
- O motor resolve uma **margem efetiva** por porte e a usa tanto na projeção B2C por canal quanto na B2B por faixa de volume.
- O cálculo salvo registra a margem efetiva aplicada e sua origem, para que o histórico continue auditável ("por que esta peça saiu a R$ 35?").
- O precificador consegue ver a fórmula expandida e simular uma peça com valores **ainda não salvos**, comparando preço vigente × preço projetado, sem gravar nada.
- Faixas de porte já cadastradas continuam produzindo exatamente o preço de hoje até que alguém configure uma margem.

**Non-Goals:**

- Recalcular ou migrar cálculos já salvos em `price_calculations`.
- Margem por canal específico (ex.: margem diferente na Shopee e na Amazon) — a taxa por canal já existe e cobre a diferença de custo de canal; margem por canal é outra discussão.
- Margem por categoria de peça (miniatura, utilitário, linha Leon) ou por peça individual.
- Precificação de assinatura recorrente (fase 4 do negócio) — fora do escopo do motor atual.
- Persistir cenários de simulação (o simulador é efêmero, não tem histórico).

## Decisions

### Decisão 1 — Margem por porte vive em `size_tier_ranges`, não em tabela nova

Quatro colunas novas em `size_tier_ranges`:

```sql
b2c_margin_pct  numeric not null default 0
b2c_margin_mode text    not null default 'somar' check (b2c_margin_mode in ('somar','substituir'))
b2b_margin_pct  numeric not null default 0
b2b_margin_mode text    not null default 'somar' check (b2b_margin_mode in ('somar','substituir'))
```

A faixa de porte já é a entidade que representa "peça P/M/G" e já é versionada por `valid_from` com o versionamento que a margem precisa. Uma tabela `size_tier_margins` separada exigiria duplicar o versionamento e resolver "qual margem vale para a faixa vigente X" — complexidade sem ganho, já que margem e faixa mudam pelo mesmo motivo (revisão de precificação por porte).

**Trade-off aceito**: como o registro é imutável, mexer só na margem de G cria um novo registro de faixa G repetindo peso/tempo. É exatamente o que já acontece com `channel_fees` (alterar a taxa fixa reescreve o registro inteiro do canal) — comportamento conhecido e coerente.

Os defaults `0` / `'somar'` são o que garante retrocompatibilidade: `0 somado` ao alvo global reproduz a conta de hoje, bit a bit, sem backfill.

### Decisão 2 — Margem efetiva é aditiva, resolvida por uma função pura

```ts
type MarginMode = "somar" | "substituir";

interface EffectiveMargin {
  basePct: number;      // margem-alvo global (B2C) ou da faixa de volume (B2B)
  tierMarginPct: number; // margem da faixa de porte
  mode: MarginMode;
  effectivePct: number;  // o que de fato multiplica o custo
}

function resolveEffectiveMargin(basePct, tierMarginPct, mode): EffectiveMargin
// somar      → effectivePct = basePct + tierMarginPct
// substituir → effectivePct = tierMarginPct
```

Aplicada **duas vezes e de forma independente**, com parâmetros próprios: uma para B2C (base = `cost_parameters.target_margin_pct`, usando `b2c_margin_pct`/`b2c_margin_mode` do porte) e uma para cada faixa B2B (base = `b2b_pricing_tiers.target_margin_pct` daquela faixa, usando `b2b_margin_pct`/`b2b_margin_mode` do porte). Isso permite o cenário pedido: porte G soma 20% no B2C e substitui a margem da faixa por 10% no B2B.

**Alternativa rejeitada — composição multiplicativa** (`(1 + base) × (1 + porte) − 1`): matematicamente mais "correta" para margens em cascata, mas 15% + 20% viraria 38%, não 35%. O precificador raciocina somando pontos percentuais; a surpresa não vale a elegância.

**Alternativa rejeitada — um único modo/margem para B2C e B2B**: mais simples de configurar, mas impede tratar atacado e varejo com lógicas diferentes, que é justamente onde o porte pesa de forma distinta (no B2B o volume já dilui o custo fixo).

Margem por porte é validada como **não-negativa**. Para *reduzir* a margem de um porte abaixo do alvo global, o caminho é o modo `substituir` — não uma margem negativa, que tornaria a leitura da fórmula ambígua.

### Decisão 3 — Nenhum preço sai sem porte resolvido; peça composta passa a exigir escolha manual

Se o porte determina a margem, calcular sem porte não é mais possível sem escolher arbitrariamente uma margem. Então:

- **Porte ambíguo** (peso em P, tempo em G): já hoje o cálculo só é salvo com `chosenTier`. Isso continua, e agora a escolha também decide a margem — o resultado é recalculado com a margem do porte escolhido, não apenas re-rotulado.
- **Peça composta**: hoje calcula com `suggestedTier = null`. Passa a exigir `chosenTier` no input; a Server Action e a UI de composição (`product-components-manager.tsx`) ganham um seletor de porte P/M/G antes de "Calcular preço do kit".

**Alternativa rejeitada — derivar o porte da composta somando peso/tempo dos componentes**: parece automático, mas o custo dos componentes vem do *cálculo salvo* de cada um, que pode ter sido feito a partir de uma composta (peso nulo) ou com uma impressora diferente. A soma seria enganosamente precisa. O porte de um kit é uma decisão comercial (uma "caixa" é G mesmo que a soma das peças caia em M) — melhor pedir explicitamente.

**Alternativa rejeitada — fallback silencioso para a margem-alvo global quando não há porte**: preserva o fluxo atual sem atrito, mas cria uma classe de peças cuja margem ninguém configurou e ninguém vê. Preferimos falhar alto.

**Impacto de compatibilidade**: `price_calculations.suggested_tier` continua `nullable` (os registros antigos de composta têm `null` e não serão tocados), mas o motor passa a sempre gravar um porte. Nenhum CHECK novo — o banco não deve invalidar retroativamente um histórico que era legítimo quando foi escrito.

### Decisão 4 — Fórmula extraída para um módulo puro, compartilhado entre motor e simulador

As funções de cálculo (`calculateCostBreakdown`, `resolveEffectiveMargin`, `calculateChannelPrice`, `calculateB2bPrice`, `classifyTier`) saem para `src/lib/services/pricing-formula.ts`: funções puras, sem repositório, sem `async`, importáveis tanto pelo `PricingService` (servidor) quanto pelo simulador (componente cliente).

Isso é o que impede o bug clássico do simulador: uma segunda implementação da fórmula, na UI, que diverge do motor no primeiro ajuste. O simulador não reimplementa nada — ele chama as mesmas funções com parâmetros diferentes.

O módulo também exporta uma descrição estruturada dos passos (`buildFormulaSteps(...)`) que a UI renderiza como a fórmula expandida (`Custo = 1,20 + 0,38 + … = R$ 4,23`, `Shopee = 4,23 × 1,25 ÷ (1 − 0,14) + 4,00`). A UI formata; ela não calcula.

### Decisão 5 — Simulador lê os valores em edição via um contexto de rascunho na página de configuração

A tela de Configuração de precificação ganha um `PricingDraftProvider`. Cada formulário (`ParametrosForm`, `CanalFeeForm`, `SizeTierForm`, `B2bTierForm`) publica no contexto os valores que estão no `react-hook-form` naquele momento (via `form.watch()`), sem salvar nada. O simulador monta duas cópias do conjunto de parâmetros:

- **vigente**: exatamente o que veio do banco (props do Server Component);
- **rascunho**: o vigente com a entrada em edição sobreposta (a faixa de porte selecionada substitui a faixa vigente do mesmo porte; o canal em edição substitui o vigente do mesmo canal; e assim por diante).

Roda a fórmula nos dois e mostra lado a lado: `Atual: R$ 9,02 → Se salvar: R$ 10,15`. Se o formulário não foi tocado, as duas colunas coincidem e o painel funciona como pura documentação viva da fórmula.

**Alternativa rejeitada — simulador com inputs próprios, independentes dos formulários**: mais simples de implementar (nenhum contexto), mas obriga o usuário a redigitar os mesmos valores em dois lugares, e nada garante que o que ele simulou é o que ele vai salvar. O pedido é explicitamente "simular antes de atualizar os valores".

A peça de exemplo do simulador pode ser digitada (peso, tempo, impressora) ou escolhida no catálogo — nesse caso peso/tempo vêm da ficha de fatiamento cadastrada. Se o porte simulado ficar ambíguo, o simulador mostra os candidatos e deixa escolher; ele **não** bloqueia como o motor, porque não persiste nada.

### Decisão 6 — Margem aplicada entra no snapshot do cálculo

`price_calculations` ganha `effective_b2c_margin jsonb` (nullable), e cada entrada de `b2b_prices` (já `jsonb`) passa a carregar seu próprio `effectiveMargin`. Sem isso, o histórico registra "preço R$ 35" sem registrar de onde veio a margem — e como as faixas de porte são versionadas, reconstruir isso depois exigiria arqueologia de `valid_from`. Registros antigos ficam com `null` e a UI trata a ausência exibindo apenas o preço, como hoje.

## Risks / Trade-offs

- **Peça composta deixa de calcular sem intervenção** → é uma quebra deliberada (Decisão 3). Mitigação: a UI de composição já é a única porta de entrada desse cálculo, então o seletor de porte cobre 100% dos casos; a Server Action retorna erro em português explicando que falta escolher o porte, em vez de estourar exceção genérica.
- **Trocar a margem de um porte cria um registro novo de faixa com peso/tempo repetidos** → aceito (Decisão 1). Se o histórico de faixas ficar poluído, a tela já separa "vigente" de "histórico"; o custo é cosmético.
- **Margem efetiva alta + taxa de canal alta produz preço fora da realidade** (o divisor `1 − taxa%` amplifica) → é matemática correta, não bug. Mitigação: o simulador existe exatamente para isso ser visto antes de salvar. O motor mantém a guarda contra `taxa% ≥ 1` (divisão por zero/negativo).
- **Contexto de rascunho acopla os formulários à página de configuração** (Decisão 5) → mitigação: o provider é opcional; os formulários publicam via um hook que vira no-op quando não há provider, então eles continuam usáveis fora dessa tela.
- **`substituir` com margem 0 zera a margem do porte silenciosamente** → é o comportamento literal pedido, mas é um pé-na-jaca fácil de cometer. Mitigação: o simulador mostra a margem efetiva resultante em destaque; a UI do formulário explicita "substitui a margem-alvo global" ao lado do seletor de modo.

## Migration Plan

1. Migration `supabase/migrations/<timestamp>_precificacao_margem_por_porte.sql`: adiciona as quatro colunas em `size_tier_ranges` (com default) e `effective_b2c_margin` em `price_calculations` (nullable). Sem backfill — os defaults já reproduzem o comportamento atual.
2. Deploy do código. Enquanto ninguém configurar margem por porte, todo preço sai idêntico ao de antes (margem do porte 0, modo `somar`).
3. Financeiro configura as margens por porte pela tela, usando o simulador para conferir o efeito antes de salvar.

**Rollback**: reverter o app é seguro — as colunas novas têm default e o código antigo simplesmente as ignora. As colunas podem permanecer no banco. O único efeito irreversível seria um cálculo de composta salvo com porte, que o código antigo exibiria normalmente (o campo já existia e era nullable).

## Open Questions

- A margem por porte deve valer também para a precificação de assinatura recorrente (fase 4)? Fora do escopo aqui; quando a assinatura chegar, ela reusa `resolveEffectiveMargin` ou define a própria regra.
- O simulador deveria permitir salvar cenários nomeados ("cenário Natal") para comparação futura? Deixado de fora por ora — se a demanda aparecer, é uma tabela nova, sem impacto no motor.
