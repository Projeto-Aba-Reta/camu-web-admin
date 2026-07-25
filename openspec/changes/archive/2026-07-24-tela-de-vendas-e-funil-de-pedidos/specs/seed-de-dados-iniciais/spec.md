## MODIFIED Requirements

### Requirement: Comando único para popular dados iniciais
O sistema SHALL disponibilizar um comando (`npm run seed-roles`) que popula o banco com as roles e a divisão sócio→área hoje documentadas em `camu-docs`, utilizável em qualquer ambiente configurado via `.env`.

A área antes chamada "Marketplace/Vendas" é semeada como **Marketing** (slug `marketing`). A role **Vendas/Marketplace** (slug `vendas`) é semeada em separado e deixa de ser reserva: a área de Vendas passa a ter rota implementada (`/vendas/pedidos`) e policies próprias, e portanto renderiza como item **clicável** na sidebar (ver `navegacao-por-area` e `tela-de-vendas`).

#### Scenario: Execução em banco vazio
- **WHEN** o comando `seed-roles` é executado contra um banco sem nenhuma role cadastrada
- **THEN** o sistema cria as roles Produção, Marketing, Vendas/Marketplace, Site, Assinatura, Infra/Automação, Financeiro e Societário, e os 3 usuários de exemplo com suas atribuições correspondentes

#### Scenario: Role de vendas com tela implementada
- **WHEN** um usuário com a role `vendas` e nenhuma outra role acessa o dashboard
- **THEN** o sistema exibe "Vendas/Marketplace" na sidebar como item clicável, levando à listagem de pedidos da área de Vendas

## ADDED Requirements

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
