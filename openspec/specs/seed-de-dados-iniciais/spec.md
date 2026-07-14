# seed-de-dados-iniciais

## Purpose

Script (`npm run seed-roles`) que popula, de forma idempotente, as roles e a divisão sócio→área hoje documentadas em `camu-docs`, servindo como ponto de partida editável pelo Owner, não como verdade fixa.

## Requirements

### Requirement: Comando único para popular dados iniciais
O sistema SHALL disponibilizar um comando (`npm run seed-roles`) que popula o banco com as roles e a divisão sócio→área hoje documentadas em `camu-docs`, utilizável em qualquer ambiente configurado via `.env`.

A área antes chamada "Marketplace/Vendas" passa a ser semeada como **Marketing** (slug `marketing`), refletindo a única tela que a área de fato tem. Uma role **Vendas/Marketplace** (slug `vendas`) é semeada em separado como reserva do domínio de vendas por canal, que ainda não foi construído — ela nasce sem tela e sem policy, e portanto renderiza como item não-clicável na sidebar (ver `navegacao-por-area`).

#### Scenario: Execução em banco vazio
- **WHEN** o comando `seed-roles` é executado contra um banco sem nenhuma role cadastrada
- **THEN** o sistema cria as roles Produção, Marketing, Vendas/Marketplace, Site, Assinatura, Infra/Automação, Financeiro e Societário, e os 3 usuários de exemplo com suas atribuições correspondentes

#### Scenario: Role de reserva sem tela
- **WHEN** um usuário com a role `vendas` e nenhuma outra role acessa o dashboard
- **THEN** o sistema exibe "Vendas/Marketplace" na sidebar como item não-clicável, por não haver rota implementada para a área

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
