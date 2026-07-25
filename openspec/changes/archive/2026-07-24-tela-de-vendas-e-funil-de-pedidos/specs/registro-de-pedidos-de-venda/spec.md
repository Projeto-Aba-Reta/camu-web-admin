## ADDED Requirements

### Requirement: Cadastro manual de pedido de venda
O sistema SHALL permitir que um usuário autorizado cadastre um pedido de venda diretamente no ERP, informando obrigatoriamente o nome do comprador, a origem da venda e ao menos um item, e opcionalmente contato do comprador (e-mail e/ou telefone), endereço de entrega e observações. O pedido cadastrado manualmente SHALL ser persistido na mesma entidade de pedidos usada pela loja do site, recebendo código de pedido pela mesma sequência.

#### Scenario: Cadastro com os campos mínimos
- **WHEN** um usuário autorizado cadastra um pedido informando comprador, origem da venda e um item com peça do catálogo, quantidade e preço unitário praticado
- **THEN** o sistema cria o pedido com código gerado, associa o item informado, calcula o total a partir dos itens e posiciona o pedido na etapa inicial do funil

#### Scenario: Cadastro sem comprador
- **WHEN** um usuário tenta cadastrar um pedido sem informar o nome do comprador
- **THEN** o sistema rejeita a operação, informando que o comprador é obrigatório

#### Scenario: Cadastro sem nenhum item
- **WHEN** um usuário tenta cadastrar um pedido sem nenhum item
- **THEN** o sistema rejeita a operação, informando que o pedido precisa de pelo menos um item

### Requirement: Item do pedido referencia o catálogo com snapshot de nome e preço
O sistema SHALL permitir escolher a peça de cada item a partir do catálogo de peças, gravando no item o nome da peça e o preço unitário praticado como snapshot do momento da venda, de forma que renomear ou reprecificar a peça depois não altere pedidos já registrados. O preço unitário praticado SHALL ser editável pelo usuário, podendo divergir do preço de tabela da peça.

#### Scenario: Peça renomeada depois da venda
- **WHEN** uma peça vendida em um pedido é renomeada no catálogo
- **THEN** o pedido continua exibindo o nome da peça como estava no momento da venda

#### Scenario: Preço praticado diferente do preço de tabela
- **WHEN** um usuário cadastra um item com preço unitário diferente do preço de tabela da peça
- **THEN** o sistema aceita o valor informado e o usa no total do pedido, sem exigir justificativa

#### Scenario: Peça removida do catálogo
- **WHEN** uma peça vendida em um pedido é excluída do catálogo
- **THEN** o item do pedido perde a referência à peça, mas preserva nome, preço unitário e quantidade registrados

### Requirement: Quantidade e valores positivos
O sistema SHALL exigir que a quantidade de cada item seja um inteiro maior que zero e que preço unitário, frete e total sejam valores monetários não negativos, armazenados em centavos.

#### Scenario: Quantidade zero
- **WHEN** um usuário informa quantidade `0` em um item
- **THEN** o sistema rejeita a operação, informando que a quantidade precisa ser maior que zero

#### Scenario: Preço unitário negativo
- **WHEN** um usuário informa um preço unitário negativo
- **THEN** o sistema rejeita a operação

### Requirement: Total do pedido derivado dos itens mais frete
O sistema SHALL calcular o subtotal do pedido como a soma de `preço unitário × quantidade` de todos os itens, e o total como subtotal mais frete, recalculando ambos sempre que um item for adicionado, alterado ou removido.

#### Scenario: Adição de item recalcula o total
- **WHEN** um usuário adiciona um segundo item a um pedido já cadastrado
- **THEN** o sistema recalcula subtotal e total do pedido considerando os dois itens

#### Scenario: Frete informado entra no total
- **WHEN** um pedido tem subtotal de R$ 80,00 e frete de R$ 12,00
- **THEN** o total do pedido é R$ 92,00

### Requirement: Edição e exclusão de pedido cadastrado no ERP
O sistema SHALL permitir editar os dados de um pedido (comprador, contato, origem, vendedor responsável, itens, frete e observações) e excluir um pedido. A exclusão SHALL remover em cascata os itens, os lançamentos de custo e o histórico de etapas daquele pedido.

#### Scenario: Edição de comprador
- **WHEN** um usuário autorizado corrige o nome do comprador de um pedido
- **THEN** o sistema persiste a alteração sem afetar o código do pedido nem sua etapa atual

#### Scenario: Exclusão de pedido
- **WHEN** um usuário autorizado exclui um pedido
- **THEN** o sistema remove o pedido junto de seus itens, custos e histórico de etapas, e ele deixa de contar no resultado de vendas

### Requirement: Coexistência com pedidos vindos da loja do site
O sistema SHALL tratar pedidos criados pela loja do site e pedidos cadastrados manualmente como a mesma entidade, exibindo ambos na listagem e no funil. Pedidos criados sem etapa do funil SHALL receber automaticamente a etapa inicial, e pedidos criados sem origem de venda SHALL ser exibidos com a origem `loja_propria`.

#### Scenario: Pedido inserido pela landing page
- **WHEN** a loja do site insere um pedido sem informar etapa do funil nem origem de venda
- **THEN** o sistema posiciona o pedido na etapa inicial do funil e o exibe na tela de vendas com origem loja própria

#### Scenario: Listagem mistura as duas procedências
- **WHEN** um usuário abre a listagem de pedidos
- **THEN** o sistema exibe, na mesma lista, pedidos do site e pedidos cadastrados manualmente, ordenados por data de criação decrescente

### Requirement: Listagem de pedidos com filtros
O sistema SHALL exibir os pedidos em uma listagem com código, comprador, origem, vendedor responsável, etapa atual, valor de venda, custo real e lucro, permitindo filtrar por período de criação, origem de venda, vendedor responsável e etapa do funil.

#### Scenario: Filtro por origem
- **WHEN** um usuário filtra a listagem pela origem "boca-a-boca"
- **THEN** o sistema exibe apenas os pedidos cuja origem é boca-a-boca

#### Scenario: Filtro por período sem resultados
- **WHEN** um usuário filtra por um período em que não houve vendas
- **THEN** o sistema exibe a listagem vazia com uma mensagem indicando que não há pedidos no período

### Requirement: Acesso ao registro de pedidos de venda
O sistema SHALL permitir leitura dos pedidos a `owner`/`socio` ou às roles `vendas`, `financeiro` e `producao`, e escrita (cadastrar, editar, excluir) apenas a `owner`/`socio` ou à role `vendas`.

#### Scenario: Usuário de Produção tenta cadastrar venda
- **WHEN** um usuário com apenas a role `producao` tenta cadastrar um pedido de venda
- **THEN** o sistema rejeita a operação, pois cadastrar venda é responsabilidade da área de Vendas

#### Scenario: Usuário de Vendas cadastra pedido
- **WHEN** um usuário com a role `vendas` cadastra um pedido
- **THEN** o sistema persiste o pedido normalmente
