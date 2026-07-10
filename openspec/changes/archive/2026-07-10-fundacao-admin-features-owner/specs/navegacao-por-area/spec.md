## MODIFIED Requirements

### Requirement: Seção de Administração restrita ao Owner
O sistema SHALL exibir a seção "Administração" da sidebar apenas para usuários
com `user_type = 'owner'`. A seção SHALL ser composta por múltiplos subitens
navegáveis (ex.: Painel, Usuários, Roles, Auditoria, Configurações, Convites &
Sessões), cada um com `href` próprio apontando para uma rota implementada sob
`admin/**`. Nenhum subitem desta seção SHALL ser renderizado sem `href`.

#### Scenario: Sócio acessa o dashboard
- **WHEN** um usuário com `user_type = 'socio'` acessa o dashboard
- **THEN** a seção "Administração" não aparece na sidebar

#### Scenario: Owner acessa o dashboard
- **WHEN** um usuário com `user_type = 'owner'` acessa o dashboard
- **THEN** a seção "Administração" aparece na sidebar com todos os subitens
  navegáveis, cada um com `href` válido

#### Scenario: Owner clica no subitem "Usuários"
- **WHEN** um Owner clica no subitem "Usuários" dentro da seção
  "Administração"
- **THEN** o sistema navega para a página de listagem de usuários
  (`admin/usuarios`)

#### Scenario: Owner clica no subitem "Roles"
- **WHEN** um Owner clica no subitem "Roles" dentro da seção "Administração"
- **THEN** o sistema navega para a página de listagem de roles (`admin/roles`)
