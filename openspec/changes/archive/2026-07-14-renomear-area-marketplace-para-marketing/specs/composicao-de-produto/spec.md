## RENAMED Requirements

- FROM: `### Requirement: Leitura ampla por Produção, Financeiro e Vendas; escrita restrita a Produção`
- TO: `### Requirement: Leitura ampla por Produção, Financeiro e Marketing; escrita restrita a Produção`

## MODIFIED Requirements

### Requirement: Leitura ampla por Produção, Financeiro e Marketing; escrita restrita a Produção
O sistema SHALL permitir leitura da composição de uma peça a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`, e permitir criar, editar ou remover vínculos de componente apenas a usuários `owner`/`socio` ou com a role `producao` — mesma regra de acesso já usada no cadastro do catálogo.

#### Scenario: Usuário de Marketing consulta a composição de uma peça
- **WHEN** um usuário com apenas a role `marketing` consulta os componentes de uma peça composta
- **THEN** o sistema exibe a lista de componentes e quantidades normalmente

#### Scenario: Usuário de Marketing tenta editar a composição
- **WHEN** um usuário com apenas a role `marketing` tenta adicionar ou remover um componente
- **THEN** o sistema rejeita a escrita por Row Level Security
