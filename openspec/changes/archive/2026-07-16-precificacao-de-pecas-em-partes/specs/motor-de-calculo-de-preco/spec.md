## MODIFIED Requirements

### Requirement: Cálculo de custo a partir de peso e tempo de impressão
Dado peso em gramas e tempo de impressão em horas — informados diretamente ou derivados de uma ficha de fatiamento cadastrada para a peça e a impressora — e uma impressora, o sistema SHALL calcular o custo total como a soma de custo de filamento, custo de energia (tempo × consumo médio × preço por kWh vigente), depreciação (tempo × depreciação por hora vigente da impressora), reserva de falha (percentual vigente sobre o subtotal) e custo de embalagem vigente. O custo de filamento SHALL ser calculado por linha de material: quando a linha (ou a parte) referencia um insumo de filamento do estoque, usa o custo por kg desse insumo; quando não há vínculo, usa o preço por kg global vigente. Cada cálculo SHALL registrar, por linha, a origem do preço de filamento usado (insumo vinculado ou preço global).

#### Scenario: Cálculo de peça pequena com peso e tempo digitados
- **WHEN** um usuário solicita o cálculo para 15g e 2,1h na Ender-3 V3 SE, digitados manualmente, com os parâmetros de referência vigentes e sem filamento do estoque vinculado
- **THEN** o sistema retorna o custo total como a soma dos cinco componentes, cada um individualizado no resultado, usando o preço global de filamento por kg

#### Scenario: Cálculo com filamento do estoque vinculado
- **WHEN** um usuário solicita o cálculo para uma peça cuja ficha de fatiamento tem a linha de material vinculada ao insumo "Filamento PLA Vermelho", com custo por kg diferente do global
- **THEN** o sistema calcula o custo de filamento dessa linha pelo custo por kg do insumo vinculado e registra que a origem do preço foi o insumo

#### Scenario: Cálculo a partir de uma ficha de fatiamento cadastrada
- **WHEN** um usuário solicita o cálculo informando uma peça e uma impressora que já têm ficha de fatiamento cadastrada, sem digitar peso ou tempo
- **THEN** o sistema deriva o peso e o tempo a partir da ficha de fatiamento e calcula o custo total normalmente, registrando qual ficha originou o cálculo

### Requirement: Cálculo de custo agregado para peça composta
O sistema SHALL calcular o custo total de uma peça composta como a soma de duas parcelas: (1) para cada parte inline, o custo próprio da parte — custo de filamento (peso da parte × custo por kg do insumo vinculado, ou preço global quando não vinculado), custo de energia, depreciação e reserva de falha a partir da impressora e do tempo daquela parte — multiplicado pela quantidade da parte; e (2) para cada componente referenciado do catálogo, o custo do cálculo de preço mais recente daquele componente, excluída a embalagem desse componente, multiplicado pela sua quantidade. A reserva de falha SHALL incidir por peça impressa (cada parte e cada componente carrega a sua). O custo de embalagem vigente SHALL ser somado uma única vez ao conjunto (produto final embalado uma vez). O sistema SHALL retornar também o breakdown individual de cada parte e de cada componente. O cálculo de uma peça composta SHALL exigir um porte informado explicitamente pelo usuário, já que uma peça composta não tem um único peso e tempo a classificar automaticamente e o porte determina a margem aplicada.

#### Scenario: Cálculo do sistema completo da Caixa Mandala com partes inline
- **WHEN** um usuário solicita o cálculo de preço da peça composta "Caixa Mandala", formada pelas partes inline decágono, cunhas e travas, informando o porte G
- **THEN** o sistema retorna o custo total agregado, o breakdown de filamento/energia/depreciação/reserva de falha de cada parte multiplicado pela sua quantidade, a embalagem aplicada uma única vez ao conjunto, e os preços projetados com a margem efetiva da faixa G

#### Scenario: Cálculo de peça composta mista
- **WHEN** um usuário solicita o cálculo de uma peça composta com uma parte inline "Base" e um componente do catálogo "Tampa personalizada" (quantidade 1), informando o porte M
- **THEN** o sistema soma o custo próprio da parte "Base" com o custo do cálculo mais recente da "Tampa personalizada", aplica reserva de falha e embalagem uma vez, e retorna o breakdown de cada fonte

#### Scenario: Parte com filamento do estoque em peça composta
- **WHEN** uma parte inline de uma peça composta tem o insumo "Filamento PLA Branco" vinculado
- **THEN** o custo de filamento dessa parte é calculado pelo custo por kg desse insumo, e não pelo preço global

#### Scenario: Cálculo de peça composta sem porte informado
- **WHEN** um usuário solicita o cálculo de preço de uma peça composta sem informar o porte
- **THEN** o sistema rejeita o cálculo com uma mensagem indicando que o porte precisa ser escolhido, e nenhum registro é salvo no histórico
