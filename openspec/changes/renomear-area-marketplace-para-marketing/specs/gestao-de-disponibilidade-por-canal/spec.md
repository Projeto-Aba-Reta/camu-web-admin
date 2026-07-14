## RENAMED Requirements

- FROM: `### Requirement: Acesso de gestão de disponibilidade por Produção e Vendas`
- TO: `### Requirement: Acesso de gestão de disponibilidade por Produção e Marketing`

## MODIFIED Requirements

### Requirement: Acesso de gestão de disponibilidade por Produção e Marketing
O sistema SHALL permitir ativar, desativar e ajustar preço de listagens por canal a usuários `owner`/`socio` ou com role `producao` ou `marketing`.

#### Scenario: Usuário de Marketing ajusta disponibilidade por canal
- **WHEN** um usuário com apenas a role `marketing` ativa um novo canal para uma peça existente
- **THEN** o sistema aceita a ação normalmente
