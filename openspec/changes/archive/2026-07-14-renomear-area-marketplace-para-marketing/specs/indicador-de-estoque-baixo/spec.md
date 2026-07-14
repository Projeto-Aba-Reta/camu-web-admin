## MODIFIED Requirements

### Requirement: Indicador não visível a usuários sem acesso ao domínio de Produção
O sistema SHALL ocultar o indicador de estoque baixo para usuários sem `user_type` `owner`/`socio` e sem a role `producao`.

#### Scenario: Usuário de Marketing acessa o dashboard
- **WHEN** um usuário com apenas a role `marketing` acessa qualquer página do dashboard
- **THEN** o indicador de estoque baixo não aparece na topbar
