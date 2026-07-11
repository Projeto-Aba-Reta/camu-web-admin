## ADDED Requirements

### Requirement: Registro append-only de movimentação de insumo
O sistema SHALL registrar toda entrada ou saída de insumo como um novo registro de movimentação, classificado em `compra`, `consumo_producao`, `perda_refugo` ou `ajuste_manual`, nunca editando ou removendo uma movimentação já registrada.

#### Scenario: Registro de compra de insumo
- **WHEN** um usuário autorizado registra a compra de 1kg de filamento
- **THEN** o sistema cria uma movimentação de entrada com `movement_type = 'compra'` e quantidade positiva

#### Scenario: Registro de consumo em produção
- **WHEN** um usuário registra o consumo de 15g de filamento na produção de uma peça
- **THEN** o sistema cria uma movimentação de saída com `movement_type = 'consumo_producao'` e quantidade negativa, vinculada à impressora e, quando informado, à peça produzida

### Requirement: Saldo sempre derivado das movimentações
O sistema SHALL calcular o saldo atual de um insumo como a soma de todas as suas movimentações registradas, sem manter um campo de saldo editável diretamente.

#### Scenario: Consulta de saldo após múltiplas movimentações
- **WHEN** um insumo tem uma entrada de 3000g e duas saídas de 15g e 35g
- **THEN** o sistema retorna o saldo atual como 2950g, calculado a partir da soma das movimentações

### Requirement: Vínculo opcional entre consumo de insumo e produção de peça
Ao registrar uma saída de insumo do tipo `consumo_producao` vinculada a uma peça, o sistema SHALL permitir, opcionalmente, criar na mesma operação a movimentação correspondente de entrada de peça pronta.

#### Scenario: Consumo de insumo sem gerar peça pronta ainda
- **WHEN** um usuário registra consumo de insumo para uma impressão ainda em andamento, sem marcar a opção de gerar peça pronta
- **THEN** o sistema registra apenas a saída de insumo, sem criar nenhuma movimentação de peça pronta

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir registrar movimentações de insumo apenas a usuários `owner`/`socio` ou com a role `producao`, com leitura ampla equivalente à leitura de insumos.

#### Scenario: Usuário de Financeiro tenta registrar uma movimentação
- **WHEN** um usuário com apenas a role `financeiro` tenta registrar uma movimentação de insumo
- **THEN** o sistema rejeita a escrita por Row Level Security
