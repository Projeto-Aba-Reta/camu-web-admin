## ADDED Requirements

### Requirement: Login público por e-mail e senha
O sistema SHALL disponibilizar uma tela pública de login (sem exigir sessão prévia) onde um usuário se autentica com e-mail e senha via Supabase Auth.

#### Scenario: Login com credenciais válidas
- **WHEN** um usuário com conta ativa (`profiles.status = 'active'`) informa e-mail e senha corretos na tela de login
- **THEN** o sistema cria uma sessão autenticada e redireciona o usuário para o dashboard

#### Scenario: Login com credenciais inválidas
- **WHEN** um usuário informa e-mail ou senha incorretos
- **THEN** o sistema exibe uma mensagem de erro na própria tela de login e não cria sessão

### Requirement: Proteção de rotas do dashboard
O sistema SHALL exigir sessão autenticada para acessar qualquer rota fora do grupo público (`(public)`), redirecionando usuários não autenticados para a tela de login.

#### Scenario: Acesso ao dashboard sem sessão
- **WHEN** um usuário sem sessão ativa tenta acessar qualquer rota do dashboard
- **THEN** o sistema redireciona o usuário para `/login`

#### Scenario: Acesso à tela de login já autenticado
- **WHEN** um usuário com sessão ativa acessa `/login`
- **THEN** o sistema redireciona o usuário para a página inicial do dashboard

### Requirement: Encerramento de sessão
O sistema SHALL permitir que um usuário autenticado encerre sua sessão explicitamente.

#### Scenario: Logout
- **WHEN** um usuário autenticado aciona a ação de sair
- **THEN** o sistema invalida a sessão e redireciona o usuário para a tela de login

### Requirement: Renovação automática de sessão
O sistema SHALL renovar automaticamente o token de sessão de um usuário autenticado a cada requisição, sem exigir novo login enquanto o refresh token for válido.

#### Scenario: Requisição com sessão próxima de expirar
- **WHEN** um usuário autenticado faz uma requisição ao dashboard com o token de acesso expirado mas o refresh token ainda válido
- **THEN** o sistema renova a sessão de forma transparente e a requisição prossegue sem redirecionar para o login
