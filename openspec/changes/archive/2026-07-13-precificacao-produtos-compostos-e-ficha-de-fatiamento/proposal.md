## Why

A sessão de alinhamento de precificação de 12/07/2026 (Caixa Mandala e Leon Judoca) comparou os números validados com a arquitetura atual e expôs três problemas: os parâmetros de custo vigentes estão desatualizados (filamento a R$90/kg quando o valor confirmado é R$130/kg), o motor de cálculo não tem como precificar um produto formado por várias peças impressas separadamente (ex.: Caixa Mandala = decágono + cunhas + travas), e não existe um modelo de preço B2B/por volume para canais como academias — só o preço de equilíbrio por canal de marketplace. Além disso, a ficha de fatiamento (peso/tempo reais do fatiador) já existe no sistema mas não alimenta o motor de cálculo, que ainda depende de digitação manual duplicada. Sem isso, não dá para fechar o preço da Caixa Mandala nem validar a proposta de preço B2C/B2B do Leon Judoca dentro do próprio painel.

## What Changes

- Atualizar os parâmetros de custo vigentes: novo registro em `cost_parameters` com filamento R$130/kg e energia R$0,80/kWh (embalagem mantida em R$3, a confirmar; reserva de falha mantida em 12,5%, dentro da faixa validada de 10-15%).
- Adicionar parâmetro de margem-alvo (percentual, versionado) aos parâmetros de custo, usado no cálculo de preço sugerido — hoje a margem é só o resíduo entre custo e taxa de canal, sem nenhum alvo configurável.
- Conectar o motor de cálculo de preço à ficha de fatiamento: ao calcular o preço de uma peça que já tem ficha de fatiamento cadastrada para a impressora selecionada, peso e tempo passam a ser lidos dessa ficha em vez de digitados; a digitação manual continua disponível como alternativa quando não houver ficha cadastrada.
- Introduzir suporte a produto composto (kit): uma peça do catálogo pode ser do tipo `composta`, referenciando uma ou mais peças componentes (cada uma com sua própria ficha/cálculo) e a quantidade de cada componente no conjunto; o custo da peça composta é a soma dos custos dos componentes multiplicados pela quantidade.
- Introduzir modelo de precificação B2B por volume: faixas de desconto por quantidade mínima, sem taxa de canal, com margem-alvo própria (distinta da margem-alvo B2C), aplicável tanto a peças simples quanto a peças compostas.
- Atualizar a tela de configuração de precificação para editar a margem-alvo e as faixas de desconto por volume B2B, com o mesmo padrão de histórico versionado já usado para os demais parâmetros.
- Atualizar a tela de cálculo de preço por peça para: oferecer seleção de ficha de fatiamento cadastrada (com opção de digitação manual); exibir o preço/margem B2C por canal e o preço B2B por faixa de volume lado a lado; e, para peça composta, exibir o breakdown de custo por componente somado ao total do conjunto.
- Nenhuma mudança é **BREAKING**: peso/tempo manuais continuam aceitos quando não há ficha, `simples` continua o tipo padrão de peça, e margem-alvo/faixas B2B são novos parâmetros opcionais que não alteram o comportamento de cálculos já existentes.

## Capabilities

### New Capabilities
- `composicao-de-produto`: peça do catálogo composta por múltiplos componentes (outras peças + quantidade), com custo agregado calculado a partir do custo de cada componente.
- `precificacao-por-volume-b2b`: modelo de preço por lote/volume, sem taxa de canal, com faixas de desconto por quantidade mínima e margem-alvo própria.

### Modified Capabilities
- `motor-de-calculo-de-preco`: passa a (1) consumir a ficha de fatiamento como fonte de peso/tempo quando existir, mantendo a entrada manual como alternativa; (2) considerar a margem-alvo vigente no preço sugerido por canal; (3) calcular o custo agregado de peças compostas somando o custo de seus componentes.
- `parametros-de-custo`: novo parâmetro versionado de margem-alvo (percentual), ao lado dos já existentes.
- `calculo-de-preco-por-peca`: formulário passa a permitir escolher uma ficha de fatiamento cadastrada em vez de digitar peso/tempo, e o resultado passa a exibir preço B2B por volume ao lado do preço B2C por canal.
- `catalogo-de-pecas`: peça passa a ter um tipo (`simples` ou `composta`); peças `composta` referenciam uma lista de peças componentes com quantidade.
- `configuracao-de-precificacao`: tela de parâmetros passa a incluir margem-alvo e a tela ganha uma nova seção de faixas de desconto por volume B2B.
- `ficha-de-fatiamento`: passa a ser consumida pelo motor de cálculo de preço como fonte primária de peso/tempo por peça+impressora, além do uso já existente na fila de produção.

## Impact

- Dados: novo registro em `cost_parameters` (parâmetros atualizados) e nova coluna de margem-alvo na mesma tabela; nova tabela de composição de produto (peça composta → componentes + quantidade); nova tabela de faixas de desconto B2B por volume; nova coluna de tipo de peça em `products`.
- Código: `src/lib/services/pricing-service.ts` (novo caminho de cálculo agregado e consumo de ficha de fatiamento), `src/lib/services/catalog-service.ts` (tipo de peça e componentes), `src/lib/services/slicing-sheet-service.ts` (exposição para o motor de cálculo), `src/components/precificacao/calculo-form.tsx` e `parametros-form.tsx`, `scripts/seed-pricing.ts` (novos valores de referência).
- Depende do documento de origem "Camu — Alinhamento de Precificação (Mandala & Leon Judoca)" (12/07/2026), hoje pendente de upload formal no `camu-docs` — o brief da Caixa Mandala no `camu-docs` deve ser atualizado com os custos reais depois que esta mudança entrar no ar, e os valores de parâmetro aqui devem ser tratados como preliminares até esse upload.
- Não há gatilho direto de migração jurídica (MEI→ME) nesta mudança, mas o novo canal B2B por volume pode acelerar o faturamento acumulado — vale observar o acompanhamento de faturamento x teto MEI já existente no painel à medida que vendas B2B entrarem.
