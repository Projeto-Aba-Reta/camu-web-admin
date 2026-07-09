# controle-de-acesso

## Purpose

Modelo de `user_type` (Owner/Sócio/Member), catálogo de roles e sub-roles, atribuição de roles/sub-roles a usuários, e aplicação desse modelo via RLS no banco (incluindo o bypass total de Owner/Sócio).

## Requirements

### Requirement: Tipos de usuário de plataforma
Todo usuário SHALL ter um `user_type` único dentre `owner`, `socio` ou `member`, armazenado em `profiles`, com `member` como valor padrão.

#### Scenario: Novo usuário criado
- **WHEN** um novo registro é criado em `auth.users`
- **THEN** o sistema cria automaticamente o `profiles` correspondente com `user_type = 'member'`

### Requirement: Acesso irrestrito de Owner e Sócio
Usuários com `user_type` igual a `owner` ou `socio` SHALL ter acesso de leitura e escrita a todos os dados protegidos por Row Level Security nas tabelas de identidade e acesso, independentemente de possuírem roles ou sub-roles atribuídas.

#### Scenario: Owner consulta dados sem role atribuída
- **WHEN** um usuário com `user_type = 'owner'` consulta a tabela `roles`
- **THEN** o sistema retorna todas as roles existentes, mesmo que o Owner não tenha nenhuma role atribuída em `user_roles`

#### Scenario: Sócio acessa dado de área que não comanda
- **WHEN** um usuário com `user_type = 'socio'` consulta dados de uma role que não está em seus `user_roles`
- **THEN** o sistema permite a leitura, pois o bypass de RLS de Sócio é incondicional e não depende de estado de interface

### Requirement: Catálogo dinâmico de roles
O sistema SHALL manter um catálogo de roles (áreas de negócio) identificadas por `slug` único, sem nenhuma role pré-cadastrada por este change.

#### Scenario: Consulta ao catálogo de roles recém-criado
- **WHEN** a migration deste change é aplicada em um banco novo
- **THEN** a tabela `roles` existe e está vazia, sem dados de seed

### Requirement: Catálogo de sub-roles vinculado a uma role
Cada sub-role SHALL pertencer a exatamente uma role (`sub_roles.role_id`), com `slug` único dentro da role.

#### Scenario: Duas roles com sub-roles de mesmo slug
- **WHEN** duas roles diferentes têm cada uma uma sub-role com `slug = 'visualizar'`
- **THEN** o sistema aceita ambas, pois a unicidade de `slug` é escopada por `role_id`

### Requirement: Atribuição de role a usuário implica associação rastreável
O sistema SHALL registrar, para cada atribuição de role ou sub-role a um usuário, quem concedeu (`granted_by`) e quando (`granted_at`).

#### Scenario: Atribuição de role
- **WHEN** uma role é atribuída a um usuário via `user_roles`
- **THEN** o registro criado contém o `user_id` do concedente e o timestamp da concessão

### Requirement: Atribuir sub-role implica a role pai
Ao atribuir uma sub-role a um usuário, o sistema SHALL garantir que esse usuário também possua a role correspondente em `user_roles`, criando-a automaticamente se ainda não existir.

#### Scenario: Sub-role atribuída sem a role pai previamente concedida
- **WHEN** uma sub-role da role "Financeiro" é atribuída a um usuário que ainda não tem a role "Financeiro" em `user_roles`
- **THEN** o sistema cria automaticamente o registro correspondente em `user_roles` para a role "Financeiro"

### Requirement: Row Level Security habilitado por padrão
Todas as tabelas de identidade e acesso (`profiles`, `roles`, `sub_roles`, `user_roles`, `user_sub_roles`) SHALL ter Row Level Security habilitado desde a criação, sem política de acesso irrestrito por padrão.

#### Scenario: Consulta sem autenticação
- **WHEN** uma requisição sem sessão autenticada tenta ler qualquer uma dessas tabelas via API pública
- **THEN** o sistema nega o acesso por não haver policy que autorize usuários anônimos
