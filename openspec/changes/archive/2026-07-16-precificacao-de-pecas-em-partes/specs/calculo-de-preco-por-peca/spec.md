## MODIFIED Requirements

### Requirement: Breakdown de custo por componente para peça composta
O sistema SHALL exibir, ao calcular o preço de uma peça composta, o breakdown de cada fonte de custo do conjunto: para cada parte inline, o seu custo (filamento, energia e depreciação) e a sua quantidade; e para cada componente referenciado do catálogo, o custo e a quantidade. A tela SHALL exibir também a reserva de falha e a embalagem aplicadas ao conjunto e o custo total agregado. A tela SHALL exigir que o usuário escolha o porte da peça composta antes de disparar o cálculo, já que uma peça composta não tem porte classificado automaticamente e o porte determina a margem aplicada.

#### Scenario: Resultado do cálculo da Caixa Mandala com partes inline
- **WHEN** um cálculo é concluído para a peça composta "Caixa Mandala" formada por partes inline (decágono, cunhas, travas), com o porte G escolhido pelo usuário
- **THEN** a tela lista, para cada parte, seu custo (filamento, energia, depreciação) e quantidade, a reserva de falha e a embalagem do conjunto, o custo total agregado e os preços projetados com a margem efetiva da faixa G

#### Scenario: Origem do preço de filamento exibida por parte
- **WHEN** uma parte tem um insumo de filamento do estoque vinculado e outra não tem
- **THEN** a tela indica, por parte, se o custo de filamento veio do insumo vinculado ou do preço global

#### Scenario: Cálculo de peça composta sem porte escolhido
- **WHEN** o usuário tenta calcular o preço de uma peça composta sem ter escolhido o porte
- **THEN** a tela impede o disparo do cálculo e indica que a escolha do porte é necessária
