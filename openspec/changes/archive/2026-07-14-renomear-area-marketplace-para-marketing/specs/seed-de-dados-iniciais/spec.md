## MODIFIED Requirements

### Requirement: Comando único para popular dados iniciais
O sistema SHALL disponibilizar um comando (`npm run seed-roles`) que popula o banco com as roles e a divisão sócio→área hoje documentadas em `camu-docs`, utilizável em qualquer ambiente configurado via `.env`.

A área antes chamada "Marketplace/Vendas" passa a ser semeada como **Marketing** (slug `marketing`), refletindo a única tela que a área de fato tem. Uma role **Vendas/Marketplace** (slug `vendas`) é semeada em separado como reserva do domínio de vendas por canal, que ainda não foi construído — ela nasce sem tela e sem policy, e portanto renderiza como item não-clicável na sidebar (ver `navegacao-por-area`).

#### Scenario: Execução em banco vazio
- **WHEN** o comando `seed-roles` é executado contra um banco sem nenhuma role cadastrada
- **THEN** o sistema cria as roles Produção, Marketing, Vendas/Marketplace, Site, Assinatura, Infra/Automação, Financeiro e Societário, e os 3 usuários de exemplo com suas atribuições correspondentes

#### Scenario: Role de reserva sem tela
- **WHEN** um usuário com a role `vendas` e nenhuma outra role acessa o dashboard
- **THEN** o sistema exibe "Vendas/Marketplace" na sidebar como item não-clicável, por não haver rota implementada para a área
