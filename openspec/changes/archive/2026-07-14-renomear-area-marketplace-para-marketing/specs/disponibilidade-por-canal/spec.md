## RENAMED Requirements

- FROM: `### Requirement: Escrita liberada a Produção e Vendas`
- TO: `### Requirement: Escrita liberada a Produção e Marketing`

## MODIFIED Requirements

### Requirement: Escrita liberada a Produção e Marketing
O sistema SHALL permitir criar, atualizar e desativar listagens por canal a usuários `owner`/`socio` ou com role `producao` ou `marketing`, com leitura ampla equivalente à leitura de peças.

#### Scenario: Usuário de Marketing ajusta preço praticado em um canal
- **WHEN** um usuário com apenas a role `marketing` atualiza o preço praticado de uma listagem existente
- **THEN** o sistema aceita a atualização, pois a escrita de disponibilidade por canal é liberada para essa role
