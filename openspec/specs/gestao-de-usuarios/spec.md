# gestao-de-usuarios

## Purpose

Telas de Owner para convidar usuários por e-mail, atribuir/remover roles, sub-roles e alterar `user_type`, restritas a usuários com `user_type = 'owner'`.

## Requirements

### Requirement: Owner pode convidar um novo usuário por e-mail
O sistema SHALL permitir que um Owner convide um novo usuário informando um e-mail, criando o usuário em estado `invited` até que ele defina sua senha.

#### Scenario: Convite de e-mail ainda não cadastrado
- **WHEN** um Owner convida um e-mail que não corresponde a nenhum usuário existente
- **THEN** o sistema cria o usuário com `status = 'invited'` e dispara o e-mail de convite

#### Scenario: Convite de e-mail já cadastrado
- **WHEN** um Owner tenta convidar um e-mail que já corresponde a um usuário existente
- **THEN** o sistema rejeita o convite e exibe uma mensagem informando que o usuário já existe

### Requirement: Owner pode atribuir e remover roles e sub-roles de um usuário
O sistema SHALL permitir que um Owner atribua ou remova roles e sub-roles de qualquer usuário.

#### Scenario: Atribuição de sub-role sem a role pai
- **WHEN** um Owner atribui a um usuário uma sub-role cuja role pai o usuário ainda não possui
- **THEN** o sistema atribui a sub-role e também concede a role pai automaticamente ao usuário

### Requirement: Owner pode alterar o tipo de um usuário
O sistema SHALL permitir que um Owner altere o `user_type` de um usuário entre `owner`, `socio` e `member`, exigindo confirmação explícita antes de aplicar a mudança.

#### Scenario: Promoção a Owner
- **WHEN** um Owner altera o `user_type` de um usuário `member` para `owner` e confirma a ação
- **THEN** o usuário passa a ter acesso irrestrito e a ver a seção "Administração" na sidebar

### Requirement: Sistema impede remoção do último Owner
O sistema SHALL impedir que o único usuário com `user_type = 'owner'` tenha seu tipo alterado para outro valor.

#### Scenario: Tentativa de rebaixar o único Owner existente
- **WHEN** um Owner tenta alterar o próprio `user_type` (ou o de outro Owner) sendo ele o único Owner do sistema
- **THEN** o sistema rejeita a alteração e exibe uma mensagem explicando que deve existir ao menos um Owner

### Requirement: Acesso restrito ao Owner
O sistema SHALL impedir usuários com `user_type` diferente de `owner` de convidar usuários ou alterar roles/sub-roles/`user_type` de qualquer usuário.

#### Scenario: Sócio tenta acessar a tela de gestão de usuários
- **WHEN** um usuário com `user_type = 'socio'` tenta acessar a rota de administração de usuários
- **THEN** o sistema nega o acesso à tela
