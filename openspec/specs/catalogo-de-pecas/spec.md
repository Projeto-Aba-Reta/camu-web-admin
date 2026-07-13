# catalogo-de-pecas

## Purpose

Cadastro de peças do catálogo autoral do ateliê: nome, descrição, categoria de canal, porte e status de ciclo de vida, com vínculo opcional a um cálculo de preço (`price_calculations`) e controle de acesso por role (leitura ampla, escrita restrita a Produção).

## Requirements

### Requirement: Cadastro de peça com categoria de canal e porte independentes
O sistema SHALL permitir cadastrar uma peça do catálogo com nome, descrição, categoria de canal (`miniatura_colecionavel`, `personalizado`, `utilitario`, `linha_leon`) e porte (`P`, `M`, `G`), armazenados como atributos independentes entre si.

#### Scenario: Cadastro de uma peça da linha Leon de porte P
- **WHEN** um usuário autorizado cadastra uma peça com categoria `linha_leon` e porte `P`
- **THEN** o sistema persiste a peça com os dois atributos, sem exigir relação entre o valor de um e o do outro

### Requirement: Status de ciclo de vida da peça
Toda peça SHALL ter um status dentre `rascunho`, `ativo`, `inativo` ou `descontinuado`, com `rascunho` como padrão na criação.

#### Scenario: Nova peça criada sem status informado
- **WHEN** uma peça é criada sem status explícito
- **THEN** o sistema define o status como `rascunho`

### Requirement: Tipo de peça simples ou composta
Toda peça SHALL ter um tipo dentre `simples` ou `composta`, com `simples` como padrão na criação; uma peça `composta` é aquela formada por outras peças do catálogo cadastradas como seus componentes.

#### Scenario: Nova peça criada sem tipo informado
- **WHEN** uma peça é criada sem tipo explícito
- **THEN** o sistema define o tipo como `simples`

#### Scenario: Cadastro de peça composta
- **WHEN** um usuário autorizado cadastra uma peça com tipo `composta`
- **THEN** o sistema permite associar componentes a essa peça, conforme a capacidade de composição de produto

### Requirement: Vínculo opcional com cálculo de preço
Uma peça SHALL poder ser vinculada a um registro existente de `price_calculations`, e SHALL poder existir sem esse vínculo (peça ainda não precificada).

#### Scenario: Peça criada antes de qualquer cálculo de preço
- **WHEN** uma peça é cadastrada sem um cálculo de preço vinculado
- **THEN** o sistema aceita a criação normalmente, mantendo `price_calculation_id` nulo

#### Scenario: Vínculo de peça a um cálculo existente
- **WHEN** uma peça é vinculada a um `price_calculations` existente
- **THEN** o sistema associa o vínculo sem alterar o registro de cálculo original

### Requirement: Leitura ampla por Produção, Financeiro e Vendas
O sistema SHALL permitir leitura do catálogo a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketplace-vendas`.

#### Scenario: Usuário de Vendas consulta o catálogo
- **WHEN** um usuário com apenas a role `marketplace-vendas` consulta a lista de peças
- **THEN** o sistema retorna as peças, pois a leitura é liberada para essa role

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir criar, editar e remover peças apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Vendas tenta cadastrar peça
- **WHEN** um usuário com apenas a role `marketplace-vendas` tenta cadastrar uma nova peça
- **THEN** o sistema rejeita a escrita por Row Level Security
