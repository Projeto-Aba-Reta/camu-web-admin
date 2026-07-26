# registro-de-pedidos-de-venda

## Purpose

Registro dos pedidos de venda do ateliê — cadastrados manualmente no ERP ou recebidos da loja do site, na mesma entidade e na mesma sequência de códigos. Cobre comprador, contato, origem da venda, vendedor responsável, itens com snapshot de nome e preço praticado do catálogo, frete e totais derivados, além da listagem com filtros e das regras de edição, exclusão e acesso.

## Requirements

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

### Requirement: Vendedor responsável em texto livre
O sistema SHALL registrar quem vendeu como um nome digitado livremente, sem exigir que a pessoa tenha conta no sistema — vendas de boca-a-boca e de feira costumam ser fechadas por gente de fora da plataforma. O sistema SHALL sugerir os nomes de vendedor já usados em outros pedidos enquanto o usuário digita, sem impedir que ele informe um nome novo, e SHALL descartar espaços em volta do nome ao gravar.

#### Scenario: Venda fechada por quem não é usuário do sistema
- **WHEN** um usuário informa, em quem vendeu, o nome de alguém que não tem cadastro na plataforma
- **THEN** o sistema aceita o nome informado e o exibe na listagem, no cartão do funil e no detalhe do pedido

#### Scenario: Reaproveitamento de nome já usado
- **WHEN** um usuário começa a digitar no campo de quem vendeu
- **THEN** o sistema oferece os nomes de vendedor já registrados em outros pedidos como sugestão

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

### Requirement: Item fora do catálogo
O sistema SHALL permitir que um item do pedido não referencie peça do catálogo, sendo identificado apenas pelo nome digitado — encomenda sob medida, brinde e peça de teste são vendidos sem existir no catálogo. O nome SHALL ser obrigatório nesse caso, e o item SHALL seguir as mesmas regras de quantidade, preço praticado e totais dos demais.

#### Scenario: Venda de encomenda sob medida
- **WHEN** um usuário cadastra um item escolhendo "item fora do catálogo" e digitando "Chaveiro sob medida", com quantidade e preço
- **THEN** o sistema registra o item sem peça associada, preservando o nome digitado

#### Scenario: Item fora do catálogo sem nome
- **WHEN** um usuário tenta salvar um pedido com item fora do catálogo e nome em branco
- **THEN** o sistema rejeita a operação, informando que o item precisa de um nome

### Requirement: Precificação simples do item fora do catálogo
O sistema SHALL oferecer, no cadastro de um item fora do catálogo, o cálculo do preço pela mesma fórmula do motor de precificação, a partir do peso, do tempo de impressão e da impressora informados, exibindo custo, lucro e preço final antes de aplicar. A margem SHALL vir da margem-alvo vigente somada à do porte classificado, podendo ser sobreposta apenas para aquele item, e o canal SHALL ser opcional — sem canal, o preço não desconta taxa. Aplicar o resultado SHALL preencher o preço praticado do item e guardar o custo unitário estimado.

#### Scenario: Cálculo aplicado ao item
- **WHEN** um usuário informa peso e tempo de impressão de um item fora do catálogo e aplica o resultado
- **THEN** o sistema preenche o preço praticado do item com o preço final calculado e guarda o custo unitário estimado

#### Scenario: Precificação sem parâmetros cadastrados
- **WHEN** um usuário abre a precificação sem parâmetros de custo ou sem impressora ativa cadastrada
- **THEN** o sistema informa o que falta cadastrar em vez de calcular com valores arbitrários

#### Scenario: Margem sobreposta no item
- **WHEN** um usuário informa uma margem diferente da sugerida para aquele item
- **THEN** o sistema recalcula o preço com a margem informada, sem alterar os parâmetros vigentes de precificação

### Requirement: Custo estimado dos itens vira custo real do pedido
O sistema SHALL registrar, a cada gravação do pedido, um único lançamento de custo derivado da soma dos custos unitários estimados dos itens multiplicados por suas quantidades, distinguível dos lançamentos manuais. O lançamento derivado SHALL ser reescrito a cada gravação e removido quando não houver mais custo estimado, e os lançamentos manuais do pedido SHALL permanecer intactos.

#### Scenario: Custo estimado entra no lucro do pedido
- **WHEN** um pedido é salvo com um item precificado em R$ 9,00 de custo e quantidade 2
- **THEN** o pedido passa a ter um lançamento de custo de R$ 18,00 e o lucro exibido nas telas de custo real e de resultado desconta esse valor

#### Scenario: Reedição do pedido não duplica o custo
- **WHEN** o mesmo pedido é salvo de novo com o custo estimado alterado para R$ 15,00
- **THEN** o lançamento derivado passa a valer R$ 15,00, sem somar um segundo lançamento

#### Scenario: Lançamento manual preservado
- **WHEN** um pedido tem um lançamento manual de frete e seu custo estimado é recalculado
- **THEN** o lançamento manual permanece inalterado

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
O sistema SHALL exibir os pedidos em uma listagem com código, comprador, origem, vendedor responsável, etapa atual, valor de venda, custo real e lucro, permitindo filtrar por período de criação, origem de venda, vendedor responsável e etapa do funil. O filtro por vendedor SHALL casar por trecho do nome, sem diferenciar maiúsculas de minúsculas.

#### Scenario: Filtro por trecho do nome do vendedor
- **WHEN** um usuário filtra a listagem por vendedor digitando "ana"
- **THEN** o sistema exibe os pedidos cujo vendedor contém esse trecho, como "Ana" e "Ana Paula"

#### Scenario: Filtro por origem
- **WHEN** um usuário filtra a listagem pela origem "boca-a-boca"
- **THEN** o sistema exibe apenas os pedidos cuja origem é boca-a-boca

#### Scenario: Filtro por período sem resultados
- **WHEN** um usuário filtra por um período em que não houve vendas
- **THEN** o sistema exibe a listagem vazia com uma mensagem indicando que não há pedidos no período

### Requirement: Acesso ao registro de pedidos de venda
O sistema SHALL permitir leitura dos pedidos a `owner`/`socio` ou às roles `vendas`, `precificacao` e `producao`, e escrita (cadastrar, editar, excluir) apenas a `owner`/`socio` ou à role `vendas`.

#### Scenario: Usuário de Produção tenta cadastrar venda
- **WHEN** um usuário com apenas a role `producao` tenta cadastrar um pedido de venda
- **THEN** o sistema rejeita a operação, pois cadastrar venda é responsabilidade da área de Vendas

#### Scenario: Usuário de Vendas cadastra pedido
- **WHEN** um usuário com a role `vendas` cadastra um pedido
- **THEN** o sistema persiste o pedido normalmente
