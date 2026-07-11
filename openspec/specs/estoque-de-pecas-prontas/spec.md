# estoque-de-pecas-prontas

## Purpose

Registro append-only de entradas (produção) e saídas (venda, perda, ajuste) de peças do catálogo (`products`), com saldo sempre derivado da soma das movimentações — nunca um campo editado diretamente. Uma entrada de produção pode referenciar a movimentação de consumo de insumo que a originou, permitindo rastrear o processo de ponta a ponta. Escrita restrita a Produção; leitura ampla equivalente à leitura do catálogo de peças.

## Requirements

### Requirement: Registro append-only de movimentação de peça pronta
O sistema SHALL registrar toda entrada ou saída de peça pronta como um novo registro de movimentação, classificado em `producao`, `venda`, `perda` ou `ajuste_manual`, nunca editando ou removendo uma movimentação já registrada.

#### Scenario: Registro de peça produzida
- **WHEN** um usuário autorizado registra a produção de 2 unidades de uma peça
- **THEN** o sistema cria uma movimentação de entrada com `movement_type = 'producao'` e quantidade positiva vinculada à peça

#### Scenario: Registro de venda de peça pronta
- **WHEN** um usuário registra a venda de 1 unidade de uma peça
- **THEN** o sistema cria uma movimentação de saída com `movement_type = 'venda'` e quantidade negativa

### Requirement: Saldo de peça pronta sempre derivado
O sistema SHALL calcular a quantidade disponível de uma peça como a soma de todas as suas movimentações registradas, sem manter um campo de quantidade editável diretamente.

#### Scenario: Consulta de disponibilidade de uma peça
- **WHEN** uma peça tem duas entradas de produção (2 e 3 unidades) e uma saída de venda (1 unidade)
- **THEN** o sistema retorna a quantidade disponível como 4 unidades

### Requirement: Vínculo rastreável com o consumo de insumo de origem
Uma movimentação de entrada de peça pronta do tipo `producao` SHALL poder referenciar a movimentação de consumo de insumo que a originou, quando essa informação estiver disponível.

#### Scenario: Produção registrada a partir de consumo de insumo já lançado
- **WHEN** um usuário registra a produção de uma peça informando qual movimentação de consumo de insumo a originou
- **THEN** o sistema persiste essa referência, permitindo rastrear qual saída de insumo gerou aquela peça

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir registrar movimentações de peça pronta apenas a usuários `owner`/`socio` ou com a role `producao`, com leitura ampla equivalente à leitura do catálogo de peças.

#### Scenario: Usuário de Financeiro tenta registrar uma movimentação de peça pronta
- **WHEN** um usuário com apenas a role `financeiro` tenta registrar uma movimentação de peça pronta
- **THEN** o sistema rejeita a escrita por Row Level Security
