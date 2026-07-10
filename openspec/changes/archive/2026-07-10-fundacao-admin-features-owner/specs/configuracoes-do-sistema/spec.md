## ADDED Requirements

### Requirement: Configurações do sistema restritas ao Owner
O sistema SHALL disponibilizar uma tela de configurações do sistema
(parâmetros globais chave/valor do painel), visível e editável apenas por
usuários com `user_type = 'owner'`.

#### Scenario: Sócio tenta acessar as configurações
- **WHEN** um usuário com `user_type = 'socio'` navega para a tela de
  configurações do sistema
- **THEN** o sistema nega o acesso, seguindo o mesmo guard das demais rotas
  `admin/**`

#### Scenario: Owner acessa as configurações
- **WHEN** um Owner acessa a tela de configurações do sistema
- **THEN** o sistema exibe os parâmetros atualmente cadastrados com seus
  valores

### Requirement: Alteração de configuração é auditada
Toda alteração de valor de uma configuração do sistema SHALL registrar quem
alterou e quando, e SHALL gerar um registro no log de auditoria.

#### Scenario: Owner altera um parâmetro
- **WHEN** um Owner altera o valor de um parâmetro existente
- **THEN** o sistema persiste o novo valor, atualiza o usuário/data da última
  alteração e cria o registro correspondente no log de auditoria
