# Spec: Log de Auditoria

## Purpose

TBD - Define o registro e a consulta de ações administrativas sensíveis
realizadas na seção Administração, garantindo rastreabilidade de autor, ação,
entidade afetada e data/hora.

## Requirements

### Requirement: Registro de ações administrativas sensíveis
O sistema SHALL registrar em um log de auditoria toda ação administrativa
sensível, incluindo: criar/editar/excluir role, criar/editar/excluir
sub-role, convidar usuário, alterar `user_type` de um usuário, atribuir ou
remover role/sub-role de um usuário, alterar uma configuração do sistema,
reenviar/cancelar um convite e revogar uma sessão. Cada registro SHALL conter
o autor (usuário autenticado que executou a ação), o tipo de ação, a entidade
afetada e a data/hora.

#### Scenario: Owner exclui uma role
- **WHEN** um Owner exclui uma role existente
- **THEN** o sistema cria um registro de auditoria identificando o Owner como
  autor, a ação como exclusão de role e a role afetada

#### Scenario: Owner altera o `user_type` de um usuário
- **WHEN** um Owner altera o `user_type` de um usuário de `member` para `socio`
- **THEN** o sistema cria um registro de auditoria com o valor anterior e o
  novo valor de `user_type`

### Requirement: Consulta do log de auditoria restrita ao Owner
O sistema SHALL exibir o log de auditoria, em ordem cronológica decrescente,
apenas para usuários com `user_type = 'owner'`.

#### Scenario: Sócio tenta acessar a auditoria
- **WHEN** um usuário com `user_type = 'socio'` navega para a tela de
  auditoria
- **THEN** o sistema nega o acesso, seguindo o mesmo guard das demais rotas
  `admin/**`

#### Scenario: Owner consulta o log de auditoria
- **WHEN** um Owner acessa a tela de auditoria
- **THEN** o sistema exibe os registros mais recentes primeiro, com autor,
  ação, entidade afetada e data/hora
