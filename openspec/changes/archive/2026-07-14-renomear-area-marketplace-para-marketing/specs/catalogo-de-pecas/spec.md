## RENAMED Requirements

- FROM: `### Requirement: Leitura ampla por Produção, Financeiro e Vendas`
- TO: `### Requirement: Leitura ampla por Produção, Financeiro e Marketing`

## MODIFIED Requirements

### Requirement: Leitura ampla por Produção, Financeiro e Marketing
O sistema SHALL permitir leitura do catálogo a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`.

#### Scenario: Usuário de Marketing consulta o catálogo
- **WHEN** um usuário com apenas a role `marketing` consulta a lista de peças
- **THEN** o sistema retorna as peças, pois a leitura é liberada para essa role

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir criar, editar e remover peças apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Marketing tenta cadastrar peça
- **WHEN** um usuário com apenas a role `marketing` tenta cadastrar uma nova peça
- **THEN** o sistema rejeita a escrita por Row Level Security
