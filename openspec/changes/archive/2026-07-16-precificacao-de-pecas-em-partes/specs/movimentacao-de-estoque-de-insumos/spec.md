## MODIFIED Requirements

### Requirement: Saldo sempre derivado das movimentações
O sistema SHALL calcular o saldo atual de um insumo como a soma de todas as suas movimentações registradas, sem manter um campo de saldo editável diretamente. Para insumos do tipo filamento, entradas e saídas SHALL ser normalizadas para gramas ao compor o saldo — convertendo compras informadas em kg para gramas —, de modo que compras em kg e consumos em gramas somem corretamente na mesma unidade.

#### Scenario: Consulta de saldo após múltiplas movimentações
- **WHEN** um insumo tem uma entrada de 3000g e duas saídas de 15g e 35g
- **THEN** o sistema retorna o saldo atual como 2950g, calculado a partir da soma das movimentações

#### Scenario: Compra em kg e consumo em gramas somam na mesma unidade
- **WHEN** um filamento recebe uma compra de 1kg e depois um consumo de produção de 70g
- **THEN** o sistema retorna o saldo como 930g, tendo convertido a compra de 1kg para 1000g antes de somar
