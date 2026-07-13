## Context

O motor de cálculo hoje vive em `src/lib/services/pricing-service.ts`: recebe `weightGrams`/`printHours`/`printerId` digitados na tela (`calculo-form.tsx`), monta um `CostBreakdown` (filamento + energia + depreciação + reserva de falha + embalagem) a partir do `cost_parameters` vigente, e projeta `suggestedPrice`/`margin` por canal com a fórmula `custo ÷ (1 - taxa%) + taxa fixa` — um preço de equilíbrio, sem margem-alvo. Cada cálculo é salvo como snapshot imutável em `price_calculations`.

Em paralelo, a ficha de fatiamento (`product_slicing_sheets` + `product_slicing_sheet_materials`, migration `20260711223431_ficha_de_fatiamento.sql`) já registra peso e tempo reais por peça+impressora, mas hoje só é lida pela fila de produção (`fila-de-impressao`) — o motor de preço não a consome.

O catálogo (`products`) modela peça como unidade única: não há como representar um produto formado por várias peças impressas separadamente (ex.: Caixa Mandala = 1 decágono + N cunhas + N travas), nem um preço B2B por volume distinto do preço de equilíbrio por canal de marketplace.

Esta mudança fecha essas três lacunas identificadas na sessão de alinhamento de precificação de 12/07/2026, mantendo os invariantes já estabelecidos no motor (parâmetros versionados, cálculo imutável, preço por canal independente).

## Goals / Non-Goals

**Goals:**
- Atualizar os parâmetros de custo vigentes com os valores validados na sessão (filamento, energia).
- Fazer o motor de cálculo ler peso/tempo da ficha de fatiamento quando ela existir para a peça+impressora, sem obrigar digitação manual duplicada.
- Suportar produto composto (kit/BOM): peça `composta` referenciando componentes com quantidade, custo agregado.
- Suportar um modelo de preço B2B por volume (faixas por quantidade mínima, sem taxa de canal).
- Tornar a margem-alvo um parâmetro explícito e versionado, em vez de só o resíduo do preço de equilíbrio.

**Non-Goals:**
- Importação automática do arquivo do fatiador (.3mf/.gcode) — a ficha de fatiamento continua sendo cadastro manual dos números lidos na tela do slicer, conforme já decidido no design da `ficha-de-fatiamento`.
- Fluxo de venda/pedido B2B (CRM de academias, emissão de proposta, contrato) — esta mudança entrega o **modelo de preço**, não a gestão do relacionamento comercial B2B.
- Alterar o conjunto de canais de marketplace suportados ou o schema de `channel_fees`.
- Workflow de aprovação para mudança de parâmetro — mantém o padrão já existente (Owner/Financeiro escreve, gera novo registro versionado, sem etapa de aprovação separada).

## Decisions

**1. Ficha de fatiamento como fonte de peso/tempo — via `productId` opcional, não duplicação de campos.**
`PriceCalculationInput` ganha um campo opcional `productId`; `weightGrams`/`printHours` passam a ser opcionais, obrigatórios apenas quando `productId` não é informado. Quando `productId` está presente sem peso/tempo digitados, `PricingService` busca a ficha de fatiamento da combinação peça+impressora (novo `slicingSheets` no `PricingRepositories`, via `findByProductAndPrinter`), deriva `weightGrams` como a soma de `pieceGrams` das linhas de material (mesma regra já especificada em "Peso da peça derivado da ficha") e usa o `printHours` da ficha. O `slicingSheetId` da ficha usada fica registrado no resultado (`PriceCalculationResult.slicingSheetId`) para rastreabilidade. Alternativa considerada: resolver peso/tempo só na UI e continuar enviando valores brutos ao service — rejeitada porque duplicaria a regra de agregação de peso (já existe na spec de `ficha-de-fatiamento`) em dois lugares e quebraria o rastreio de qual ficha originou o cálculo salvo.

**2. Produto composto — nova tabela `product_components`, custo agregado por soma de cálculos dos componentes.**
`products` ganha `product_type` (`simples` | `composta`, default `simples`). Nova tabela `product_components(parent_product_id, component_product_id, quantity, ...)`. O custo de uma peça composta é obtido por um novo `calculateCompositePrice`: para cada componente, usa o `price_calculations` mais recente vinculado a ele (`products.price_calculation_id`) se existir; caso o componente ainda não tenha cálculo salvo mas tenha ficha de fatiamento cadastrada, calcula na hora (reaproveitando a decisão 1) e persiste esse cálculo antes de agregar. O breakdown final é a soma, componente a componente, de cada `CostBreakdown` multiplicado pela `quantity`, salvo como um novo `price_calculations` (mantendo o invariante de snapshot imutável). Alternativa considerada: recalcular tudo a partir de peso/tempo brutos somados de todos os componentes em uma única passada — rejeitada porque perde a rastreabilidade de custo por componente (a UI precisa mostrar o breakdown por peça, como no exemplo do decágono/cunha/trava) e não reaproveita cálculos já existentes dos componentes quando vendidos também avulsos.

**3. Validação de composição: sem ciclos, sem componente sem custo conhecido.**
Adicionar um componente a uma peça composta exige que o componente já tenha ficha de fatiamento OU `price_calculation_id` cadastrado (senão a UI bloqueia a inclusão com mensagem explicativa). A aplicação valida ausência de ciclos (peça A não pode conter, direta ou transitivamente, a si mesma) na escrita — Postgres não valida ciclos de grafo nativamente, então isso fica na camada de serviço, seguindo o padrão já usado para outras regras de negócio que não são expressáveis como `CHECK` simples.

**4. Margem-alvo — novo campo percentual em `cost_parameters`, aplicado antes da taxa de canal.**
`cost_parameters` ganha `target_margin_pct` (numeric, versionado, default `0` para não alterar cálculos existentes). Fórmula de preço por canal passa a ser `(custo × (1 + margem-alvo)) ÷ (1 - taxa%) + taxa fixa`, preservando a forma atual quando `target_margin_pct = 0`. Alternativa considerada: margem aditiva em valor fixo (R$) — rejeitada porque não escala entre portes P/M/G como o documento de referência assume (margens diferentes por categoria, não valor fixo por peça).

**5. B2B por volume — nova tabela `b2b_pricing_tiers`, preço calculado sem taxa de canal.**
Nova tabela `b2b_pricing_tiers(min_quantity, target_margin_pct, valid_from, ...)` versionada como os demais parâmetros. Preço B2B de uma faixa = `custo × (1 + margem-alvo B2B da faixa)`, sem dividir por taxa de canal (não há intermediário de marketplace no B2B). O motor retorna os preços B2B lado a lado com os preços B2C por canal no mesmo resultado de cálculo, aplicável tanto a peça simples quanto composta (a composta usa o custo agregado da decisão 2 como base). Alternativa considerada: desconto percentual direto sobre o preço B2C de um canal de referência — rejeitada porque acopla o preço B2B à taxa de um marketplace específico, o que não reflete a realidade (venda B2B não paga taxa de canal nenhuma).

## Risks / Trade-offs

- [Componente de uma peça composta sem ficha nem cálculo salvo] → bloquear a inclusão na UI/serviço até que o componente tenha ficha de fatiamento ou cálculo próprio.
- [Ciclo de composição (peça contendo a si mesma via subcomponentes)] → validação de grafo na camada de serviço antes de persistir `product_components`.
- [Margem-alvo alterando preços de canal já publicados de forma abrupta] → default `0%` preserva o comportamento atual (preço de equilíbrio); ajuste é um novo registro versionado, revertível como qualquer outro parâmetro.
- [Ficha de fatiamento editada depois de um cálculo já salvo] → não há impacto retroativo: `price_calculations` continua snapshot imutável, mesmo princípio já usado para `cost_parameters` — só cálculos novos leem a ficha atualizada.
- [Cálculo de peça composta gera novos `price_calculations` "on the fly" para componentes órfãos] → comportamento esperado, mas a UI deve indicar explicitamente quando isso acontece, para não confundir com um cálculo que o usuário pediu diretamente.

## Migration Plan

1. **Dado** (sem mudança de schema): novo registro versionado em `cost_parameters` com filamento R$130/kg e energia R$0,80/kWh, via tela de configuração já existente.
2. **Schema**: migrations aditivas — `target_margin_pct` em `cost_parameters`; `product_type` em `products`; novas tabelas `product_components` e `b2b_pricing_tiers`. Todas nullable/com default, sem quebrar dados existentes.
3. **Motor**: `PricingService` ganha resolução de peso/tempo via ficha de fatiamento quando não digitados, `calculateCompositePrice`, e o novo termo de margem-alvo na fórmula de preço por canal; novo cálculo B2B por faixa de volume.
4. **UI**: `calculo-form.tsx` ganha seleção de ficha de fatiamento; `parametros-form.tsx` ganha margem-alvo e faixas B2B; catálogo ganha edição de tipo de peça e componentes.

Rollback: cada migration é aditiva (colunas nullable, tabelas novas) — reversível sem perda de dados dos parâmetros/cálculos já existentes. Se necessário reverter o comportamento sem reverter o schema, basta manter `target_margin_pct = 0` e não popular `b2b_pricing_tiers`/`product_components`, o que preserva exatamente o comportamento atual do motor.

## Open Questions

- Confirmar com o Felipe se o custo do Leon Judoca (R$17,72, dado do Slack) já inclui energia/depreciação — não bloqueia esta mudança técnica, mas afeta os valores de referência a cadastrar depois.
- Definir a contagem real de travas do encaixe da Caixa Mandala (10 ou 20) antes de cadastrar a composição no catálogo.
- Definir com o Financeiro os valores iniciais de margem-alvo B2C e B2B — esta mudança entrega o parâmetro, não o valor de negócio.
- Confirmar se o desconto por volume B2B deve ser só por quantidade mínima de um mesmo produto/kit, ou também por valor total do pedido somando produtos distintos — o desenho aqui assume quantidade mínima por produto/kit.
