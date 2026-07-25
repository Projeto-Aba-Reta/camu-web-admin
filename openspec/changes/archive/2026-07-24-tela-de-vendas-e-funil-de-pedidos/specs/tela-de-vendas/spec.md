## ADDED Requirements

### Requirement: Área Vendas navegável na sidebar
O sistema SHALL registrar uma rota implementada para o slug `vendas`, fazendo o item "Vendas/Marketplace" da sidebar passar a ser clicável para quem tem acesso à área, com a listagem de pedidos (`/vendas/pedidos`) como página padrão.

#### Scenario: Usuário com a role vendas
- **WHEN** um usuário com a role `vendas` acessa o dashboard
- **THEN** a sidebar exibe "Vendas/Marketplace" como item clicável, levando à listagem de pedidos

#### Scenario: Owner acessa a área
- **WHEN** um Owner clica em "Vendas/Marketplace" na sidebar
- **THEN** o sistema navega para `/vendas/pedidos`

### Requirement: Guard de acesso à área Vendas
O sistema SHALL restringir todas as rotas sob `/vendas/**` a `owner`/`socio` ou às roles `vendas`, `financeiro` e `producao`, redirecionando os demais para a home do dashboard. As Server Actions da área SHALL verificar a permissão por conta própria, sem depender do guard de rota.

#### Scenario: Usuário sem acesso digita a URL
- **WHEN** um usuário com apenas a role `marketing` acessa `/vendas/pedidos` diretamente pela URL
- **THEN** o sistema o redireciona para a home do dashboard

#### Scenario: Server Action invocada por usuário sem permissão
- **WHEN** uma Server Action de cadastro de pedido é invocada por um usuário sem permissão de escrita em vendas
- **THEN** a ação falha com erro de autorização, sem gravar nada

### Requirement: Abas da área Vendas
O sistema SHALL organizar a área em abas navegáveis — Pedidos (listagem e cadastro), Funil (quadro kanban), Resultado (gráfico e totais) e Configurações (etapas e origens) — cada uma com rota própria, exibindo apenas as abas que o perfil do usuário pode acessar.

#### Scenario: Usuário de Produção na área
- **WHEN** um usuário com a role `producao` abre a área Vendas
- **THEN** o sistema exibe as abas Pedidos e Funil, sem as abas Resultado e Configurações

#### Scenario: Usuário de Vendas na área
- **WHEN** um usuário com a role `vendas` abre a área Vendas
- **THEN** o sistema exibe as quatro abas

#### Scenario: Navegação direta para aba sem permissão
- **WHEN** um usuário com a role `financeiro` acessa a rota de Configurações da área Vendas
- **THEN** o sistema nega o acesso e o redireciona para a página padrão da área

### Requirement: Ações de escrita ocultas para quem só lê
O sistema SHALL ocultar da interface os botões e formulários de escrita — cadastrar pedido, mover pedido, lançar custo, editar etapas e origens — para os usuários que não têm a permissão correspondente, além de rejeitar a operação no servidor.

#### Scenario: Financeiro vê a listagem
- **WHEN** um usuário com apenas a role `financeiro` abre a listagem de pedidos
- **THEN** o sistema exibe os pedidos sem o botão de cadastrar pedido, mas com a ação de lançar custo disponível

#### Scenario: Produção vê o funil
- **WHEN** um usuário com apenas a role `producao` abre o funil
- **THEN** o sistema exibe o quadro com a ação de mover pedido, sem as ações de editar etapas
