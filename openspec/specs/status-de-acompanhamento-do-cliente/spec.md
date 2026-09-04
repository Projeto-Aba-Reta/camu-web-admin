# status-de-acompanhamento-do-cliente

## Purpose

Status de acompanhamento do pedido voltado ao cliente final (`orders.status` + `order_events`), independente das etapas internas do funil de produção. Cobre a timeline exibida no detalhe do pedido no admin, a atualização desse status pela equipe e as regras de acesso e auditoria dessa mudança.

## Requirements

### Requirement: Timeline de acompanhamento do cliente no detalhe do pedido

O detalhe do pedido (`/vendas/pedidos/[orderId]`) SHALL exibir a timeline de acompanhamento do cliente a partir de `order_events` (colunas `status`, `note`, `created_at`), em ordem cronológica, separada e claramente distinta do histórico de etapas do funil de produção. Cada evento SHALL mostrar o status, a nota quando houver e a data/hora.

#### Scenario: Pedido com eventos de acompanhamento
- **WHEN** um usuário abre um pedido que teve os eventos `pending`, `paid` e `shipped` registrados
- **THEN** o detalhe exibe os três eventos em ordem, com data e nota de cada um, na seção "Acompanhamento do cliente"

#### Scenario: Pedido sem eventos de acompanhamento
- **WHEN** um pedido ainda não tem nenhuma linha em `order_events`
- **THEN** a seção exibe um estado vazio, sem erro

### Requirement: Atualizar o status de acompanhamento do cliente

O sistema SHALL oferecer, no detalhe do pedido, uma ação que define `orders.status` para um valor do vocabulário `pending`, `paid`, `in_production`, `finishing`, `shipped`, `delivered` ou `cancelled` e insere uma linha correspondente em `order_events` com o mesmo `status` e uma `note` opcional informada pelo usuário. O vocabulário aceito SHALL ser exatamente esse conjunto e o mesmo consumido pela landing page.

#### Scenario: Avançar o status com nota
- **WHEN** um usuário autorizado muda o status de `paid` para `finishing` e escreve a nota "lixando e pintando, sai amanhã"
- **THEN** o sistema grava `orders.status = finishing`, insere um `order_events` com `status = finishing` e essa nota, e a timeline do cliente na landing page passa a refletir o passo "Acabamento" com o texto da nota

#### Scenario: Status fora do vocabulário
- **WHEN** uma requisição tenta definir um status que não pertence ao vocabulário
- **THEN** o sistema rejeita a operação sem gravar nada

#### Scenario: Nota omitida
- **WHEN** um usuário muda o status sem escrever nota
- **THEN** o sistema insere o `order_events` com `note` nula e a operação é aceita

### Requirement: Movimentação livre de status e histórico somente-adição

O sistema SHALL permitir mover o status de acompanhamento para frente ou para trás sem exigir sequência linear. Cada mudança SHALL gerar um novo `order_events`; o sistema SHALL nunca editar nem remover eventos já gravados. Uma mudança para um status igual ao atual SHALL ser rejeitada sem gravar evento duplicado.

#### Scenario: Voltar o status por retrabalho
- **WHEN** um pedido está em `shipped` e o time descobre que a peça precisa ser refeita, movendo o status de volta para `in_production`
- **THEN** o sistema aceita a mudança e adiciona um novo `order_events`, preservando o evento de `shipped` anterior

#### Scenario: Repetir o status atual
- **WHEN** um usuário tenta definir o status para o valor que o pedido já tem
- **THEN** o sistema não grava nada e informa que não houve mudança

### Requirement: Registro do autor da mudança de status

Cada mudança de status de acompanhamento SHALL registrar qual usuário a fez e quando, de forma consultável (na `note` do evento e/ou no log de auditoria de vendas).

#### Scenario: Auditoria da mudança
- **WHEN** um usuário move o status de um pedido
- **THEN** o sistema registra esse usuário como autor da mudança, com data e hora

### Requirement: Acesso à atualização de status de acompanhamento

O sistema SHALL permitir leitura da timeline de acompanhamento a `owner`/`socio` ou às roles `vendas`, `producao` e `precificacao`, e atualização do status a `owner`/`socio` ou às roles `vendas` e `producao`.

#### Scenario: Precificação tenta atualizar status
- **WHEN** um usuário com apenas a role `precificacao` tenta atualizar o status de acompanhamento
- **THEN** o sistema rejeita a operação, permitindo-lhe apenas visualizar a timeline

#### Scenario: Produção atualiza status
- **WHEN** um usuário com a role `producao` move o status de `finishing` para `shipped`
- **THEN** o sistema aceita a mudança
