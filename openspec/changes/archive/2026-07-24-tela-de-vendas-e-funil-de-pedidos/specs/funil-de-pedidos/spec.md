## ADDED Requirements

### Requirement: Pedido ocupa exatamente uma etapa
O sistema SHALL manter cada pedido em exatamente uma etapa ativa do funil a qualquer momento, exibindo-o em uma única coluna do quadro. Um pedido criado sem etapa informada SHALL ser posicionado na etapa marcada como inicial.

#### Scenario: Pedido recém-cadastrado
- **WHEN** um usuário cadastra um pedido sem escolher etapa
- **THEN** o pedido aparece na coluna da etapa inicial do funil

#### Scenario: Pedido cadastrado direto em outra etapa
- **WHEN** um usuário cadastra um pedido de uma venda cuja peça já estava pronta, escolhendo a etapa "Aguardando envio"
- **THEN** o pedido aparece diretamente nessa coluna, sem passar pelas anteriores

### Requirement: Movimentação livre entre etapas
O sistema SHALL permitir mover um pedido de qualquer etapa ativa para qualquer outra etapa ativa, para frente ou para trás, sem exigir sequência linear. O sistema SHALL rejeitar movimentação para uma etapa arquivada.

#### Scenario: Avançar o pedido
- **WHEN** um usuário move um pedido de "Aguardando embalagem" para "Embalando"
- **THEN** o pedido passa a aparecer na coluna "Embalando" e o sistema registra a passagem no histórico

#### Scenario: Voltar o pedido por reimpressão
- **WHEN** uma peça sai com defeito e o usuário move o pedido de "Embalando" de volta para "Aguardando impressão"
- **THEN** o sistema aceita a movimentação e registra a passagem no histórico

#### Scenario: Movimentação para etapa arquivada
- **WHEN** um usuário tenta mover um pedido para uma etapa arquivada
- **THEN** o sistema rejeita a operação, informando que a etapa não está mais ativa

### Requirement: Impressora exigida na movimentação
Ao mover um pedido para uma etapa marcada como exigindo impressora, o sistema SHALL exigir a escolha de uma impressora ativa do parque e registrá-la no pedido. Ao mover o pedido para uma etapa que não exige impressora, o sistema SHALL limpar a impressora registrada no pedido, preservando-a no evento de histórico correspondente.

#### Scenario: Mover para "Imprimindo"
- **WHEN** um usuário move um pedido para a etapa "Imprimindo" e escolhe a impressora "Bambu Lab A1 Combo"
- **THEN** o sistema registra a impressora no pedido, e o cartão do pedido no quadro exibe em qual impressora ele está

#### Scenario: Mover para "Imprimindo" sem escolher impressora
- **WHEN** um usuário tenta mover um pedido para uma etapa que exige impressora sem escolher nenhuma
- **THEN** o sistema rejeita a movimentação, informando que a impressora é obrigatória nessa etapa

#### Scenario: Impressora inativa
- **WHEN** um usuário tenta atribuir uma impressora inativa do parque a um pedido
- **THEN** o sistema rejeita a operação, aceitando apenas impressoras ativas

#### Scenario: Sair da etapa de impressão
- **WHEN** um usuário move um pedido de "Imprimindo" para "Aguardando embalagem"
- **THEN** o pedido deixa de ter impressora atual, e o histórico continua mostrando em qual impressora ele esteve

### Requirement: Histórico de passagem por etapa
O sistema SHALL registrar, a cada movimentação, um evento de histórico com a etapa de origem, a etapa de destino, a impressora envolvida quando houver, o autor da movimentação e o instante em que ocorreu. Os eventos SHALL ser somente-adição — nunca editados nem removidos pela movimentação seguinte.

#### Scenario: Consulta do histórico de um pedido
- **WHEN** um usuário abre os detalhes de um pedido que já passou por quatro etapas
- **THEN** o sistema exibe as quatro passagens em ordem cronológica, com etapa, autor e data/hora de cada uma

#### Scenario: Movimentação registra o autor
- **WHEN** um usuário move um pedido entre etapas
- **THEN** o evento gravado identifica esse usuário como autor da movimentação

### Requirement: Quadro do funil agrupado por etapa
O sistema SHALL exibir o funil como um quadro com uma coluna por etapa ativa, na ordem cadastrada, cada coluna mostrando a contagem de pedidos e os cartões dos pedidos daquela etapa. Cada cartão SHALL exibir código do pedido, comprador, origem da venda, vendedor responsável quando houver, valor de venda e a impressora atual quando houver.

#### Scenario: Coluna sem pedidos
- **WHEN** uma etapa ativa não tem nenhum pedido
- **THEN** a coluna correspondente aparece no quadro, vazia, com contagem zero

#### Scenario: Cartão de pedido em impressão
- **WHEN** um pedido está na etapa "Imprimindo" com a impressora "Creality K1 Max"
- **THEN** o cartão do pedido exibe o nome dessa impressora

### Requirement: Pedidos finalizados saem do quadro por padrão
O sistema SHALL, por padrão, ocultar do quadro os pedidos que estão na etapa final há mais de 30 dias, oferecendo um controle para exibi-los. Nenhum pedido SHALL ser excluído ou alterado por esse recorte de exibição.

#### Scenario: Pedido enviado há 60 dias
- **WHEN** um usuário abre o quadro e existe um pedido na etapa "Enviado" desde 60 dias atrás
- **THEN** esse pedido não aparece no quadro até que o usuário acione a exibição do histórico completo

#### Scenario: Pedido enviado ontem
- **WHEN** um pedido foi movido para "Enviado" ontem
- **THEN** ele continua aparecendo na coluna "Enviado" do quadro

### Requirement: Acesso ao funil de pedidos
O sistema SHALL permitir leitura do funil a `owner`/`socio` ou às roles `vendas`, `producao` e `financeiro`, e movimentação de pedidos entre etapas a `owner`/`socio` ou às roles `vendas` e `producao`.

#### Scenario: Produção move pedido
- **WHEN** um usuário com a role `producao` move um pedido de "Aguardando impressão" para "Imprimindo" escolhendo uma impressora
- **THEN** o sistema aceita a movimentação, pois o andamento da produção é responsabilidade dessa área

#### Scenario: Financeiro tenta mover pedido
- **WHEN** um usuário com apenas a role `financeiro` tenta mover um pedido entre etapas
- **THEN** o sistema rejeita a operação, permitindo-lhe apenas visualizar o quadro
