# seed-de-dados-iniciais

## Purpose

Scripts que populam, de forma idempotente, os dados iniciais do sistema: `npm run seed-roles`, com as roles e a divisão sócio→área hoje documentadas em `camu-docs`, e `npm run seed-vendas`, com as etapas do funil de pedidos e as origens de venda. Servem como ponto de partida editável pelo Owner e pelo time, não como verdade fixa.

## Requirements

### Requirement: Comando único para popular dados iniciais
O sistema SHALL disponibilizar um comando (`npm run seed-roles`) que popula o banco com as roles e a divisão sócio→área hoje documentadas em `camu-docs`, utilizável em qualquer ambiente configurado via `.env`.

A área antes chamada "Marketplace/Vendas" é semeada como **Marketing** (slug `marketing`). A role **Vendas/Marketplace** (slug `vendas`) é semeada em separado e deixa de ser reserva: a área de Vendas passa a ter rota implementada (`/vendas/pedidos`) e policies próprias, e portanto renderiza como item **clicável** na sidebar (ver `navegacao-por-area` e `tela-de-vendas`).

#### Scenario: Execução em banco vazio
- **WHEN** o comando `seed-roles` é executado contra um banco sem nenhuma role cadastrada
- **THEN** o sistema cria as roles Produção, Marketing, Vendas/Marketplace, Site, Assinatura, Infra/Automação, Financeiro e Societário, e os 3 usuários de exemplo com suas atribuições correspondentes

#### Scenario: Role de vendas com tela implementada
- **WHEN** um usuário com a role `vendas` e nenhuma outra role acessa o dashboard
- **THEN** o sistema exibe "Vendas/Marketplace" na sidebar como item clicável, levando à listagem de pedidos da área de Vendas

### Requirement: Execução idempotente
O sistema SHALL permitir executar o comando de seed múltiplas vezes sem criar registros duplicados, atualizando os existentes por `slug` (roles/sub-roles) ou e-mail (usuários) quando já presentes.

#### Scenario: Segunda execução do comando
- **WHEN** o comando `seed-roles` é executado novamente após já ter sido executado com sucesso
- **THEN** nenhuma role, sub-role ou usuário é duplicado, e os registros existentes permanecem consistentes

### Requirement: Aviso de que a divisão é provisória
O comando SHALL exibir, ao final da execução, uma mensagem explícita informando que a divisão sócio→área aplicada é provisória e pode ser ajustada pelo Owner via UI.

#### Scenario: Conclusão do seed
- **WHEN** o comando `seed-roles` termina de rodar com sucesso
- **THEN** o sistema imprime uma mensagem indicando que os dados aplicados refletem uma divisão provisória, editável pelo Owner

### Requirement: Seed das etapas do funil e das origens de venda
O sistema SHALL disponibilizar um comando (`npm run seed-vendas`) que popula as etapas do funil de pedidos e as origens de venda com seus conjuntos-semente, de forma idempotente por `slug`, e SHALL incluí-lo em `npm run seed-all`.

#### Scenario: Execução em banco sem dados de vendas
- **WHEN** o comando `seed-vendas` é executado contra um banco sem etapas nem origens cadastradas
- **THEN** o sistema cria as sete etapas semente do funil e as nove origens de venda semente, com suas ordens e marcações

#### Scenario: Reexecução preserva ajustes do time
- **WHEN** o comando `seed-vendas` é executado novamente após o time ter renomeado ou reordenado etapas e origens
- **THEN** nenhum registro é duplicado e os ajustes feitos pelo time não são revertidos

#### Scenario: Seed completo inclui vendas
- **WHEN** o comando `seed-all` é executado
- **THEN** o seed de vendas roda como parte da sequência, depois do seed de roles
