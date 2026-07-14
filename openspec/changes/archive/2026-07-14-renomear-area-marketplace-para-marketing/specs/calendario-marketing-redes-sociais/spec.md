## MODIFIED Requirements

### Requirement: Acesso ao calendário de marketing
O sistema SHALL permitir cadastro e edição de datas comemorativas e itens de planejamento a usuários `owner`/`socio` ou com role `marketing`.

#### Scenario: Usuário sem a role tenta criar item de planejamento
- **WHEN** um usuário sem `owner`/`socio` e sem a role `marketing` tenta criar um item de planejamento de conteúdo
- **THEN** o sistema rejeita a escrita

#### Scenario: Usuário de Marketing acessa o calendário
- **WHEN** um usuário com apenas a role `marketing` acessa a área Marketing
- **THEN** o sistema exibe o calendário como página padrão da área, com cadastro e edição habilitados
