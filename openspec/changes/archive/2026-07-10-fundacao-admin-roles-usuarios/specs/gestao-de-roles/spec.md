## ADDED Requirements

### Requirement: Owner pode criar uma role
O sistema SHALL permitir que um usuário com `user_type = 'owner'` crie uma nova role informando nome e slug único.

#### Scenario: Criação de role com slug único
- **WHEN** um Owner submete o formulário de criação de role com um `slug` que ainda não existe
- **THEN** a role é criada e passa a aparecer na listagem de roles

#### Scenario: Criação de role com slug duplicado
- **WHEN** um Owner submete o formulário de criação de role com um `slug` já usado por outra role
- **THEN** o sistema rejeita a criação e exibe um erro de validação, sem criar duplicata

### Requirement: Owner pode editar e excluir uma role
O sistema SHALL permitir que um Owner edite o nome/descrição de uma role existente e a exclua, removendo em cascata suas sub-roles e associações de usuário.

#### Scenario: Exclusão de role com usuários associados
- **WHEN** um Owner exclui uma role que possui usuários atribuídos em `user_roles`
- **THEN** o sistema remove a role, suas sub-roles e as associações de usuário correspondentes, e os usuários afetados deixam de ver essa área na sidebar

### Requirement: Owner pode criar, editar e excluir sub-roles de uma role
O sistema SHALL permitir que um Owner gerencie sub-roles (nome, slug, descrição) dentro de uma role existente, com `slug` único por role.

#### Scenario: Criação de sub-role com slug já usado em outra role
- **WHEN** um Owner cria uma sub-role com `slug = 'visualizar'` em uma role que já tem uma sub-role de outro nome, mas outra role diferente já usa esse mesmo slug
- **THEN** a criação é permitida, pois a unicidade do slug é escopada à role

### Requirement: Acesso restrito ao Owner
O sistema SHALL impedir usuários com `user_type` diferente de `owner` de criar, editar ou excluir roles e sub-roles, mesmo que tenham acesso irrestrito de leitura como Sócio.

#### Scenario: Sócio tenta acessar a tela de gestão de roles
- **WHEN** um usuário com `user_type = 'socio'` tenta acessar a rota de administração de roles
- **THEN** o sistema nega o acesso à tela
