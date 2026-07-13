## MODIFIED Requirements

### Requirement: Formulário de cálculo a partir de peso e tempo do fatiador
O sistema SHALL exibir um formulário com seleção de uma impressora ativa e, quando a peça e a impressora selecionadas tiverem uma ficha de fatiamento cadastrada, a opção de usar o peso e o tempo dessa ficha em vez de digitá-los manualmente; quando não houver ficha cadastrada, o formulário exige peso em gramas e tempo de impressão em horas digitados.

#### Scenario: Envio do formulário com ficha de fatiamento disponível
- **WHEN** um usuário autorizado seleciona uma peça e impressora que já têm ficha de fatiamento cadastrada e envia o formulário sem digitar peso ou tempo
- **THEN** o sistema executa o cálculo usando o peso e o tempo da ficha de fatiamento e exibe o resultado na mesma tela

#### Scenario: Envio do formulário sem ficha de fatiamento cadastrada
- **WHEN** um usuário autorizado seleciona uma peça e impressora sem ficha de fatiamento cadastrada, preenche peso e tempo manualmente e envia o formulário
- **THEN** o sistema executa o cálculo com os valores digitados e exibe o resultado na mesma tela

## ADDED Requirements

### Requirement: Exibição do preço B2B por faixa de volume
O sistema SHALL exibir, ao lado da tabela de preço sugerido por canal, uma tabela com o preço B2B calculado para cada faixa de quantidade vigente.

#### Scenario: Resultado com preços B2B por faixa
- **WHEN** um cálculo é concluído e existem faixas B2B vigentes cadastradas
- **THEN** a tela lista o preço B2B de cada faixa de quantidade em uma linha própria, ao lado da tabela de preços por canal

### Requirement: Breakdown de custo por componente para peça composta
O sistema SHALL exibir, ao calcular o preço de uma peça composta, o custo de cada componente e sua quantidade, além do custo total agregado.

#### Scenario: Resultado do cálculo da Caixa Mandala
- **WHEN** um cálculo é concluído para a peça composta "Caixa Mandala"
- **THEN** a tela lista o custo e a quantidade de cada componente (decágono, cunha, trava) e o custo total do conjunto
