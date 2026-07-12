## ADDED Requirements

### Requirement: Montagem da fila a partir do catálogo
O sistema SHALL permitir adicionar um ou mais produtos do catálogo à fila de impressão, cada item com quantidade e um material de filamento (cor) associado, desde que o produto tenha um cálculo de preço vinculado (peso conhecido).

#### Scenario: Adicionar item à fila
- **WHEN** um usuário autorizado adiciona um produto do catálogo à fila com quantidade 2 e o material "Filamento PLA Branco"
- **THEN** o sistema cria um item de fila com status `na_fila`, referenciando o produto, a quantidade e o material escolhidos

#### Scenario: Produto sem cálculo de preço vinculado
- **WHEN** um usuário tenta adicionar à fila um produto do catálogo que ainda não tem cálculo de preço vinculado
- **THEN** o sistema rejeita a adição, informando que o produto precisa ter peso/cálculo definido antes de entrar na fila

### Requirement: Início de impressão com sugestão de impressora ociosa
Ao iniciar ("play") um item `na_fila`, o sistema SHALL exigir a atribuição de uma impressora ativa do parque, sugerindo por padrão uma impressora ativa que não tenha nenhum outro item em status `imprimindo` no momento.

#### Scenario: Uma única impressora ativa está ociosa
- **WHEN** um usuário inicia um item da fila e existe exatamente uma impressora ativa sem nenhum item `imprimindo`
- **THEN** o sistema pré-seleciona essa impressora como padrão, permitindo ao usuário confirmar ou trocar por outra impressora ativa

#### Scenario: Nenhuma impressora ociosa
- **WHEN** um usuário inicia um item da fila e todas as impressoras ativas já têm um item em `imprimindo`
- **THEN** o sistema não pré-seleciona nenhuma impressora, exigindo que o usuário escolha manualmente uma impressora ativa entre as disponíveis

#### Scenario: Impressora já ocupada
- **WHEN** um usuário tenta iniciar um item atribuindo uma impressora que já tem outro item em status `imprimindo`
- **THEN** o sistema rejeita a ação, informando que aquela impressora já está imprimindo outro item

#### Scenario: Início bem-sucedido
- **WHEN** um usuário inicia um item da fila com uma impressora ativa disponível (sem outro item `imprimindo` associado)
- **THEN** o sistema muda o status do item para `imprimindo`, registra a impressora escolhida e o horário de início

### Requirement: Conclusão de impressão com baixa automática de estoque
Ao concluir um item em status `imprimindo`, o sistema SHALL registrar automaticamente uma movimentação de entrada no estoque de peças prontas do produto (quantidade do item) e uma movimentação de baixa no estoque de insumos do material selecionado, na quantidade equivalente ao peso do produto multiplicado pela quantidade do item.

#### Scenario: Conclusão gera as duas movimentações de estoque
- **WHEN** um usuário marca como concluído um item `imprimindo` de 2 unidades de um produto com 35g de peso, usando o material "Filamento PLA Branco"
- **THEN** o sistema registra uma movimentação `producao` de +2 unidades no estoque de peças prontas do produto e uma movimentação `consumo_producao` de -70g no estoque do material "Filamento PLA Branco", e muda o status do item para `concluido` com o horário de término

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
O sistema SHALL permitir escrita (adicionar, iniciar, concluir, cancelar) na fila de impressão a usuários `owner`/`socio` ou com role `producao`, e leitura adicional a usuários com role `financeiro`.

#### Scenario: Usuário de Financeiro tenta iniciar uma impressão
- **WHEN** um usuário com apenas a role `financeiro` tenta iniciar (play) um item da fila
- **THEN** o sistema rejeita a ação, permitindo apenas a leitura da fila para esse usuário
