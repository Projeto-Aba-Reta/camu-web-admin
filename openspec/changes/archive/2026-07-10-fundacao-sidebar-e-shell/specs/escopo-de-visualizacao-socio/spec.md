## ADDED Requirements

### Requirement: Toggle "ver todas as áreas" exclusivo do Sócio
O sistema SHALL exibir um controle de alternância "ver todas as áreas" apenas para usuários com `user_type = 'socio'`.

#### Scenario: Owner acessa o dashboard
- **WHEN** um usuário com `user_type = 'owner'` acessa o dashboard
- **THEN** o controle de alternância não é exibido, pois o Owner já vê todas as áreas por padrão

#### Scenario: Member acessa o dashboard
- **WHEN** um usuário com `user_type = 'member'` acessa o dashboard
- **THEN** o controle de alternância não é exibido

### Requirement: Escopo padrão restrito às áreas próprias
Ao autenticar, um Sócio SHALL ter a sidebar exibida no escopo "minhas áreas" (apenas roles atribuídas a ele) por padrão, mesmo que ele tenha acesso técnico irrestrito aos dados.

#### Scenario: Sócio faz login
- **WHEN** um Sócio com roles atribuídas em `user_roles` faz login
- **THEN** a sidebar exibe inicialmente somente as áreas dessas roles, com o toggle desligado

### Requirement: Ativação do escopo "todas as áreas" é reversível e não persiste entre sessões
Ao ativar o toggle, o Sócio SHALL passar a ver todas as áreas cadastradas na sidebar; ao encerrar a sessão e autenticar novamente, o escopo SHALL retornar ao padrão "minhas áreas".

#### Scenario: Sócio ativa o toggle
- **WHEN** um Sócio aciona o controle "ver todas as áreas"
- **THEN** a sidebar passa a exibir todas as roles cadastradas no sistema, não apenas as suas

#### Scenario: Sócio faz logout e login novamente após ativar o toggle
- **WHEN** um Sócio que ativou "ver todas as áreas" encerra a sessão e autentica novamente
- **THEN** a sidebar volta a exibir apenas as áreas próprias, com o toggle desligado

### Requirement: Toggle não altera permissão de acesso a dados
A ativação ou desativação do toggle de escopo SHALL afetar somente a composição da sidebar, sem alterar o resultado de nenhuma consulta a dados protegidos por Row Level Security.

#### Scenario: Sócio acessa outra área por link direto com o toggle desligado
- **WHEN** um Sócio com o toggle "ver todas as áreas" desligado acessa diretamente a URL de uma área que não é sua
- **THEN** o sistema exibe a página normalmente, sem erro de permissão, pois o bypass de RLS do Sócio independe do estado do toggle
