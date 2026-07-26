# fila-de-impressao

## Purpose

Fila de itens de produção vinculados ao catálogo, com ciclo de vida `na_fila` → `imprimindo` → `concluido` (ou cancelamento em `na_fila`/`imprimindo` → `cancelado`). A elegibilidade de impressoras e os materiais/gramas usados vêm da ficha de fatiamento cadastrada para a combinação peça+impressora. Atribui uma impressora do parque no início da impressão, exibe um cronômetro regressivo até o horário estimado de término, gera baixa automática de estoque (peça pronta + insumos) na conclusão — manual ou automática por tempo esgotado — e envia notificação via Slack.

## Requirements

### Requirement: Montagem da fila a partir do catálogo
O sistema SHALL permitir adicionar um ou mais produtos do catálogo à fila de impressão, cada item com quantidade, desde que o produto tenha pelo menos uma ficha de fatiamento cadastrada para alguma impressora ativa do parque.

#### Scenario: Adicionar item à fila
- **WHEN** um usuário autorizado adiciona à fila um produto do catálogo com quantidade 2, sendo que o produto já tem uma ficha de fatiamento cadastrada para pelo menos uma impressora ativa
- **THEN** o sistema cria um item de fila com status `na_fila`, referenciando o produto e a quantidade escolhidos, sem exigir escolha de material nesse momento

#### Scenario: Produto sem ficha de fatiamento cadastrada
- **WHEN** um usuário tenta adicionar à fila um produto do catálogo que ainda não tem nenhuma ficha de fatiamento cadastrada
- **THEN** o sistema rejeita a adição, informando que o produto precisa ter uma ficha de fatiamento cadastrada para pelo menos uma impressora antes de entrar na fila

### Requirement: Início de impressão com sugestão de impressora ociosa
Ao iniciar ("play") um item `na_fila`, o sistema SHALL exigir a atribuição de uma impressora ativa do parque que tenha ficha de fatiamento cadastrada para o produto do item, sugerindo por padrão, dentre essas, uma impressora que não tenha nenhum outro item em status `imprimindo` no momento. Ao iniciar com sucesso, o sistema SHALL copiar para o item os materiais e as gramas (peça + suporte) da ficha de fatiamento correspondente e calcular o horário estimado de término a partir do tempo de impressão registrado na ficha.

#### Scenario: Uma única impressora elegível está ociosa
- **WHEN** um usuário inicia um item da fila e existe exatamente uma impressora ativa, com ficha de fatiamento cadastrada para o produto do item, sem nenhum item `imprimindo`
- **THEN** o sistema pré-seleciona essa impressora como padrão, permitindo ao usuário confirmar ou trocar por outra impressora elegível

#### Scenario: Nenhuma impressora elegível ociosa
- **WHEN** um usuário inicia um item da fila e todas as impressoras ativas com ficha de fatiamento cadastrada para o produto já têm um item em `imprimindo`
- **THEN** o sistema não pré-seleciona nenhuma impressora, exigindo que o usuário escolha manualmente uma impressora elegível entre as disponíveis

#### Scenario: Impressora sem ficha cadastrada para o produto
- **WHEN** um usuário tenta iniciar um item atribuindo uma impressora ativa que não tem ficha de fatiamento cadastrada para o produto do item
- **THEN** o sistema rejeita a ação, informando que é preciso cadastrar uma ficha de fatiamento para essa impressora antes de usá-la neste item

#### Scenario: Impressora já ocupada
- **WHEN** um usuário tenta iniciar um item atribuindo uma impressora que já tem outro item em status `imprimindo`
- **THEN** o sistema rejeita a ação, informando que aquela impressora já está imprimindo outro item

#### Scenario: Início bem-sucedido copia a ficha para o item
- **WHEN** um usuário inicia um item da fila com uma impressora elegível e disponível (com ficha de fatiamento cadastrada para o produto, sem outro item `imprimindo` associado)
- **THEN** o sistema muda o status do item para `imprimindo`, registra a impressora escolhida e o horário de início, copia os materiais e gramas da ficha de fatiamento correspondente para o item, e calcula o horário estimado de término

### Requirement: Conclusão de impressão com baixa automática de estoque
Ao concluir um item em status `imprimindo` — manualmente ou automaticamente por tempo esgotado —, o sistema SHALL registrar automaticamente uma movimentação de entrada no estoque de peças prontas do produto (quantidade do item) e, para cada material copiado da ficha de fatiamento no início da impressão, uma movimentação de baixa no estoque de insumos daquele material, na quantidade equivalente à soma das gramas de peça e suporte daquela linha multiplicada pela quantidade do item.

#### Scenario: Conclusão gera movimentações para múltiplos materiais
- **WHEN** um usuário marca como concluído um item `imprimindo` de 2 unidades de um produto cuja ficha de fatiamento usa, por unidade, 30g de "Filamento PLA Branco" na peça + 5g em suporte, e 10g de "Filamento PLA Preto" na peça
- **THEN** o sistema registra uma movimentação `producao` de +2 unidades no estoque de peças prontas do produto, uma movimentação `consumo_producao` de -70g no estoque de "Filamento PLA Branco", uma movimentação `consumo_producao` de -20g no estoque de "Filamento PLA Preto", e muda o status do item para `concluido` com o horário de término

### Requirement: Cronômetro regressivo por item em impressão
O sistema SHALL exibir, para cada item em status `imprimindo`, um cronômetro regressivo calculado a partir do horário estimado de término definido no início da impressão.

#### Scenario: Impressão dentro do prazo estimado
- **WHEN** um item está `imprimindo` e o horário estimado de término ainda não chegou
- **THEN** a tela exibe o tempo restante até o término estimado, atualizado continuamente sem exigir recarregar a página

#### Scenario: Prazo estimado já passou
- **WHEN** um item está `imprimindo` e o horário estimado de término já passou, mas o item ainda não foi concluído
- **THEN** a tela indica que o tempo estimado se esgotou, sem travar a exibição do item

### Requirement: Conclusão automática por tempo esgotado
O sistema SHALL concluir automaticamente, por meio de uma rotina executada no servidor, qualquer item em status `imprimindo` cujo horário estimado de término já tenha passado, aplicando exatamente as mesmas regras de baixa de estoque e notificação Slack da conclusão manual, independente de haver algum usuário com a tela da fila aberta no momento.

#### Scenario: Item concluído automaticamente sem usuário conectado
- **WHEN** a rotina do servidor executa e encontra um item `imprimindo` cujo horário estimado de término já passou, sem nenhum usuário com a tela da fila aberta no momento
- **THEN** o sistema conclui o item, gera as movimentações de estoque correspondentes e envia a notificação ao Slack, da mesma forma que uma conclusão manual geraria

#### Scenario: Item ainda dentro do prazo não é concluído pela rotina
- **WHEN** a rotina do servidor executa e encontra um item `imprimindo` cujo horário estimado de término ainda não chegou
- **THEN** o sistema não altera esse item

### Requirement: Notificação no Slack ao concluir impressão
Ao concluir um item da fila, o sistema SHALL enviar uma notificação para um webhook do Slack configurado por variável de ambiente, contendo o produto, a quantidade, a impressora utilizada e a duração da impressão.

#### Scenario: Notificação enviada com sucesso
- **WHEN** um item da fila é concluído e a variável de ambiente do webhook do Slack está configurada
- **THEN** o sistema envia uma mensagem ao Slack informando produto, quantidade, impressora e duração (horário de término menos horário de início)

#### Scenario: Webhook não configurado ou falha de envio
- **WHEN** um item da fila é concluído mas o webhook do Slack não está configurado, ou o envio falha
- **THEN** o sistema conclui a impressão e registra as movimentações de estoque normalmente, apenas registrando um aviso interno de que a notificação não foi enviada

### Requirement: Cancelamento de item da fila
O sistema SHALL permitir cancelar um item que ainda não foi concluído (em status `na_fila` ou `imprimindo`), sem gerar nenhuma movimentação de estoque.

#### Scenario: Cancelar item na fila
- **WHEN** um usuário cancela um item em status `na_fila`
- **THEN** o sistema muda o status do item para `cancelado`, sem afetar nenhum estoque

#### Scenario: Cancelar item em impressão
- **WHEN** um usuário cancela um item em status `imprimindo`
- **THEN** o sistema muda o status do item para `cancelado`, libera a impressora associada (deixa de contá-la como ocupada) e não gera nenhuma movimentação de estoque

### Requirement: Acesso à fila de impressão
O sistema SHALL permitir escrita (adicionar, iniciar, concluir, cancelar) na fila de impressão a usuários `owner`/`socio` ou com role `producao`, e leitura adicional a usuários com role `precificacao`.

#### Scenario: Usuário de Precificação tenta iniciar uma impressão
- **WHEN** um usuário com apenas a role `precificacao` tenta iniciar (play) um item da fila
- **THEN** o sistema rejeita a ação, permitindo apenas a leitura da fila para esse usuário
