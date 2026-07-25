# origem-de-venda

## Purpose

Cadastro editável das origens de venda — como a Camu conseguiu cada venda — com slug único, nome, ordem, ativa/arquivada e marcação de origem que exige vendedor responsável. Cobre o conjunto-semente de nove origens (boca-a-boca, marketplaces, loja própria, feira/evento e indicação), a exigência condicional de vendedor no cadastro de pedidos, o arquivamento que preserva o histórico e as regras de acesso.

## Requirements

### Requirement: Catálogo editável de origens de venda
O sistema SHALL manter um cadastro de origens de venda — como a Camu conseguiu aquela venda — em que cada origem tem `slug` único, nome exibível, ordem de exibição, indicador de ativa/arquivada e a marcação de se exige vendedor responsável. O time SHALL poder criar, renomear, reordenar e arquivar origens sem alteração de código.

#### Scenario: Criação de origem nova
- **WHEN** um usuário autorizado cria a origem "Feira de artesanato do bairro"
- **THEN** o sistema persiste a origem ativa, com slug derivado do nome, disponível para escolha no cadastro de pedidos

#### Scenario: Slug duplicado
- **WHEN** um usuário tenta criar uma origem cujo slug já existe
- **THEN** o sistema rejeita a operação, informando que já existe uma origem com esse identificador

### Requirement: Origens de venda semeadas
O sistema SHALL semear as origens `boca_a_boca`, `mercado_livre`, `shopee`, `tiktok_shop`, `amazon`, `shein`, `loja_propria`, `feira_evento` e `indicacao`, com `boca_a_boca` e `indicacao` marcadas como exigindo vendedor responsável. O seed SHALL ser idempotente, identificando origens existentes por `slug`.

#### Scenario: Seed em banco sem origens
- **WHEN** o seed de vendas roda contra um banco sem nenhuma origem cadastrada
- **THEN** o sistema cria as nove origens semente, na ordem definida, e marca boca-a-boca e indicação como exigindo vendedor

#### Scenario: Seed executado duas vezes
- **WHEN** o seed de vendas roda novamente após já ter rodado com sucesso
- **THEN** nenhuma origem é duplicada e as renomeações feitas pelo time não são revertidas

### Requirement: Origem que exige vendedor responsável
O sistema SHALL exigir o preenchimento do vendedor responsável — o nome de quem vendeu, em texto livre — ao cadastrar ou editar um pedido cuja origem esteja marcada como exigindo vendedor, e SHALL aceitar vendedor responsável em branco nas demais origens. Nome composto apenas de espaços SHALL ser tratado como vendedor ausente.

#### Scenario: Boca-a-boca sem vendedor informado
- **WHEN** um usuário cadastra um pedido com origem "boca-a-boca" sem informar quem vendeu
- **THEN** o sistema rejeita a operação, informando que essa origem exige o vendedor responsável

#### Scenario: Boca-a-boca com vendedor de fora da plataforma
- **WHEN** um usuário cadastra um pedido com origem "boca-a-boca" informando o nome de alguém que não tem conta no sistema
- **THEN** o sistema aceita a operação e grava o nome informado como quem vendeu

#### Scenario: Marketplace sem vendedor informado
- **WHEN** um usuário cadastra um pedido com origem "Mercado Livre" sem informar vendedor responsável
- **THEN** o sistema aceita a operação, pois a origem não exige atribuição de vendedor

#### Scenario: Origem passa a exigir vendedor depois de já ter pedidos
- **WHEN** uma origem que não exigia vendedor é alterada para exigir, e já existem pedidos antigos sem vendedor nessa origem
- **THEN** o sistema mantém os pedidos antigos inalterados e passa a exigir vendedor apenas em cadastros e edições posteriores

### Requirement: Arquivamento preserva o histórico
O sistema SHALL permitir arquivar uma origem de venda em vez de excluí-la, retirando-a das opções de novos pedidos mas preservando-a nos pedidos que já a utilizam e nos recortes do resultado de vendas. O sistema SHALL rejeitar a exclusão de uma origem que já esteja referenciada por algum pedido.

#### Scenario: Arquivar origem já usada
- **WHEN** um usuário arquiva a origem "SHEIN", que já tem pedidos registrados
- **THEN** a origem deixa de aparecer no formulário de cadastro de pedidos e os pedidos existentes continuam exibindo "SHEIN"

#### Scenario: Excluir origem em uso
- **WHEN** um usuário tenta excluir uma origem referenciada por pelo menos um pedido
- **THEN** o sistema rejeita a exclusão e orienta a arquivar a origem

### Requirement: Acesso ao cadastro de origens de venda
O sistema SHALL permitir leitura das origens de venda a `owner`/`socio` ou às roles `vendas`, `financeiro` e `marketing`, e escrita apenas a `owner`/`socio` ou à role `vendas`.

#### Scenario: Marketing tenta editar origem
- **WHEN** um usuário com apenas a role `marketing` tenta renomear uma origem de venda
- **THEN** o sistema rejeita a operação, permitindo-lhe apenas a leitura
