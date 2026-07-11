## ADDED Requirements

### Requirement: Cadastro de insumo com custo de referência
O sistema SHALL permitir cadastrar um insumo (filamento ou embalagem) com nome, tipo, unidade de medida e custo de referência próprio, independente dos parâmetros globais de precificação.

#### Scenario: Cadastro de filamento de cor especial
- **WHEN** um usuário autorizado cadastra um insumo "Filamento PLA vermelho" com custo de referência diferente do parâmetro global de filamento
- **THEN** o sistema persiste o insumo com seu próprio custo de referência, sem alterar `cost_parameters`

### Requirement: Leitura ampla por Produção e Financeiro
O sistema SHALL permitir leitura do catálogo de insumos a usuários `owner`/`socio` ou com role `producao`/`financeiro`.

#### Scenario: Usuário de Financeiro consulta insumos
- **WHEN** um usuário com apenas a role `financeiro` consulta o catálogo de insumos
- **THEN** o sistema retorna a lista de insumos e seus custos de referência

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir cadastrar e editar insumos apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Financeiro tenta cadastrar insumo
- **WHEN** um usuário com apenas a role `financeiro` tenta cadastrar um novo insumo
- **THEN** o sistema rejeita a escrita por Row Level Security
