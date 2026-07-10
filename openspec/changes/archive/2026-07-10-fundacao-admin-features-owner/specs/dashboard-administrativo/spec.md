## ADDED Requirements

### Requirement: Painel administrativo restrito ao Owner
O sistema SHALL disponibilizar uma página `/admin` que sirva de landing da
seção Administração, acessível apenas a usuários com `user_type = 'owner'`.

#### Scenario: Sócio tenta acessar o painel diretamente pela URL
- **WHEN** um usuário com `user_type = 'socio'` navega diretamente para `/admin`
- **THEN** o sistema redireciona para fora da área administrativa (mesmo
  comportamento do guard já aplicado às demais rotas `admin/**`)

### Requirement: Métricas resumidas no painel
O painel administrativo SHALL exibir, no mínimo: total de usuários por
`user_type`, total de roles cadastradas e total de convites pendentes.

#### Scenario: Owner acessa o painel
- **WHEN** um Owner acessa `/admin`
- **THEN** o sistema exibe a contagem atual de usuários por tipo, o total de
  roles cadastradas e o total de convites pendentes, refletindo o estado
  atual do banco

### Requirement: Atalhos para as demais subseções administrativas
O painel administrativo SHALL exibir atalhos de navegação para Usuários,
Roles, Auditoria, Configurações e Convites & Sessões.

#### Scenario: Owner clica em um atalho do painel
- **WHEN** um Owner clica em um dos atalhos exibidos no painel
- **THEN** o sistema navega para a subseção administrativa correspondente
