# Spec: Navegação por Área

## Purpose

Define as regras de exibição e navegabilidade dos itens de área na sidebar do dashboard, incluindo filtragem por acesso do usuário, restrições de clicabilidade por rota disponível e visibilidade da seção de Administração.

## Requirements

### Requirement: Sidebar filtrada por acesso do usuário
O sistema SHALL exibir na sidebar apenas os itens de área (role) aos quais o usuário logado tem acesso, exceto quando o usuário é Owner, que SHALL ver todas as áreas cadastradas.

#### Scenario: Member com uma role atribuída
- **WHEN** um usuário com `user_type = 'member'` e uma única role atribuída acessa o dashboard
- **THEN** a sidebar exibe apenas o item correspondente a essa role, além dos itens comuns (ex.: Home)

#### Scenario: Owner sem nenhuma role atribuída
- **WHEN** um usuário com `user_type = 'owner'` e nenhuma role em `user_roles` acessa o dashboard
- **THEN** a sidebar exibe todas as roles cadastradas no sistema

### Requirement: Item de sidebar só é clicável se houver rota implementada
O sistema SHALL exibir um item de área na sidebar como não navegável (sem link ativo) quando o usuário tem acesso à role mas não existe rota registrada para o `slug` dessa role.

#### Scenario: Role cadastrada sem página implementada
- **WHEN** o usuário tem acesso a uma role cujo `slug` não tem entrada no registro de rotas de área
- **THEN** o item aparece na sidebar em estado não clicável, sem redirecionar para uma página inexistente

### Requirement: Seção de Administração restrita ao Owner
O sistema SHALL exibir a seção "Administração" da sidebar apenas para usuários com `user_type = 'owner'`.

#### Scenario: Sócio acessa o dashboard
- **WHEN** um usuário com `user_type = 'socio'` acessa o dashboard
- **THEN** a seção "Administração" não aparece na sidebar
