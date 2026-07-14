## MODIFIED Requirements

### Requirement: Acesso conforme regra de domínio do catálogo
O sistema SHALL restringir a criação, edição e exclusão de peças a usuários `owner`/`socio` ou com a role `producao`, permitindo leitura da listagem e do detalhe a `producao`, `financeiro` e `marketing`.

#### Scenario: Usuário de Financeiro acessa a listagem
- **WHEN** um usuário com apenas a role `financeiro` acessa a listagem do catálogo
- **THEN** o sistema exibe a listagem em modo somente leitura, sem ações de criação, edição ou exclusão disponíveis
