## ADDED Requirements

### Requirement: Listagem de convites pendentes restrita ao Owner
O sistema SHALL exibir, apenas para usuários com `user_type = 'owner'`, a
lista de usuários com convite pendente (`status = 'invited'`).

#### Scenario: Owner acessa a tela de convites
- **WHEN** um Owner acessa a tela de Convites & Sessões
- **THEN** o sistema exibe todos os usuários com convite pendente

### Requirement: Reenvio e cancelamento de convite
O sistema SHALL permitir que um Owner reenvie o e-mail de convite ou cancele
(remova) um convite pendente.

#### Scenario: Owner reenvia um convite
- **WHEN** um Owner aciona "Reenviar convite" para um usuário com convite
  pendente
- **THEN** o sistema dispara um novo e-mail de convite para o mesmo endereço
  e registra a ação no log de auditoria

#### Scenario: Owner cancela um convite
- **WHEN** um Owner aciona "Cancelar convite" para um usuário com convite
  pendente
- **THEN** o sistema remove o convite pendente, impedindo que o usuário
  finalize o cadastro com aquele link, e registra a ação no log de auditoria

### Requirement: Revogação de sessão ativa
O sistema SHALL permitir que um Owner revogue as sessões ativas de um
usuário, forçando novo login.

#### Scenario: Owner revoga a sessão de um usuário
- **WHEN** um Owner aciona "Revogar sessões" para um usuário ativo
- **THEN** o sistema invalida as sessões ativas desse usuário e registra a
  ação no log de auditoria

#### Scenario: Sócio tenta acessar a tela de convites e sessões
- **WHEN** um usuário com `user_type = 'socio'` navega para a tela de
  Convites & Sessões
- **THEN** o sistema nega o acesso, seguindo o mesmo guard das demais rotas
  `admin/**`
