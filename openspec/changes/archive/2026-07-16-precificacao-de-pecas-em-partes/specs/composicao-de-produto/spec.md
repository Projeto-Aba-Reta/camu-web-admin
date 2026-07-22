## ADDED Requirements

### Requirement: Peça composta híbrida — partes inline e/ou componentes do catálogo
O sistema SHALL permitir que uma peça `composta` seja formada por partes inline (não vendáveis), por componentes referenciados do catálogo (vendáveis), ou por ambos no mesmo produto. Uma peça `composta` SHALL ter ao menos uma parte inline ou um componente do catálogo para poder ser precificada.

#### Scenario: Peça composta apenas com partes inline
- **WHEN** um usuário cadastra a peça composta "Caixa Mandala" formada apenas por partes inline (decágono, cunhas, travas), sem referenciar peças do catálogo
- **THEN** o sistema aceita a composição e a peça pode ser precificada a partir das suas partes

#### Scenario: Peça composta mista
- **WHEN** um usuário cadastra uma peça composta com uma parte inline "Base" e um componente do catálogo "Tampa personalizada" (quantidade 1)
- **THEN** o sistema persiste as duas fontes de composição no mesmo produto

#### Scenario: Peça composta sem partes nem componentes
- **WHEN** um usuário tenta precificar uma peça composta que não tem nenhuma parte inline nem componente do catálogo
- **THEN** o sistema rejeita a operação indicando que a composição está vazia

## MODIFIED Requirements

### Requirement: Custo agregado de peça composta
O sistema SHALL calcular o custo de uma peça composta como a soma de duas parcelas: (1) para cada parte inline, o custo próprio da parte — filamento (peso × custo por kg do insumo vinculado, ou preço global quando não vinculado), energia, depreciação e reserva de falha (a partir da impressora e do tempo daquela parte) — multiplicado pela quantidade da parte; e (2) para cada componente referenciado do catálogo, o custo do cálculo mais recente daquele componente, excluída a embalagem desse componente, multiplicado pela sua quantidade na composição. Reserva de falha SHALL incidir por peça impressa (cada parte e cada componente carrega a sua) e o custo de embalagem SHALL ser contado uma única vez por conjunto.

#### Scenario: Custo do sistema completo da Caixa Mandala com partes inline
- **WHEN** o sistema calcula o custo da peça composta "Caixa Mandala" formada por 1 decágono, 10 cunhas e 10 travas cadastradas como partes inline
- **THEN** o custo agregado é a soma do custo próprio de cada parte (filamento + energia + depreciação + reserva de falha) multiplicado pela sua quantidade, mais uma única embalagem para o conjunto

#### Scenario: Custo de peça composta mista
- **WHEN** o sistema calcula o custo de uma peça composta com uma parte inline "Base" e um componente do catálogo "Tampa personalizada" (quantidade 1)
- **THEN** o custo agregado soma o custo próprio da parte "Base" (com sua reserva de falha) com o custo do cálculo mais recente da "Tampa personalizada" (excluída a embalagem própria), mais uma única embalagem para o conjunto

#### Scenario: Componente do catálogo sem cálculo salvo mas com ficha de fatiamento
- **WHEN** um componente referenciado do catálogo tem ficha de fatiamento cadastrada mas nunca teve um cálculo de preço executado, e a peça composta que o contém é calculada
- **THEN** o sistema calcula e salva um novo cálculo de preço para esse componente antes de agregá-lo ao custo da peça composta

### Requirement: Componente exige custo conhecido antes de ser adicionado
O sistema SHALL exigir que uma peça componente referenciada do catálogo já tenha uma ficha de fatiamento cadastrada ou um `price_calculations` vinculado antes de poder ser adicionada como componente de uma peça composta. Partes inline não têm esse pré-requisito, pois carregam seus próprios dados de custo (filamento, gramas, impressora e tempo).

#### Scenario: Tentativa de adicionar componente do catálogo sem custo conhecido
- **WHEN** um usuário tenta adicionar como componente do catálogo uma peça que não tem ficha de fatiamento nem cálculo de preço salvo
- **THEN** o sistema rejeita a inclusão e exibe orientação para cadastrar a ficha de fatiamento ou calcular o preço da peça componente primeiro

#### Scenario: Parte inline não exige cálculo prévio
- **WHEN** um usuário adiciona uma parte inline com filamento, gramas, impressora e tempo próprios
- **THEN** o sistema aceita a parte sem exigir ficha de fatiamento nem cálculo de preço prévio
