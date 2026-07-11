# log-de-decisoes

## Purpose

Manter um registro estruturado e append-only de decisões societárias no formato ADR, restrito a Owner e Sócio.

## Requirements

### Requirement: Registro estruturado de decisão no formato ADR
O sistema SHALL permitir registrar uma decisão com título, contexto, decisão, alternativas consideradas, motivo e data da decisão.

#### Scenario: Registro de uma nova decisão
- **WHEN** um Sócio/Owner registra uma nova decisão preenchendo título, contexto, decisão, alternativas consideradas e motivo
- **THEN** o sistema persiste a entrada com a data informada

### Requirement: Log de decisões é append-only
Uma entrada do log de decisões já registrada SHALL permanecer inalterada; uma correção ou atualização de entendimento SHALL ser feita através de uma nova entrada.

#### Scenario: Tentativa de editar uma decisão já registrada
- **WHEN** um usuário tenta editar o conteúdo de uma entrada do log de decisões já criada
- **THEN** o sistema não oferece essa operação, apenas a criação de uma nova entrada

### Requirement: Listagem ordenada da mais recente para a mais antiga
O sistema SHALL exibir as entradas do log de decisões ordenadas da data de decisão mais recente para a mais antiga.

#### Scenario: Consulta do log de decisões
- **WHEN** um usuário consulta o log de decisões
- **THEN** o sistema retorna as entradas ordenadas por `decided_at` decrescente

### Requirement: Acesso restrito a Owner e Sócio
O sistema SHALL permitir leitura e escrita do log de decisões apenas a usuários com `user_type` `owner` ou `socio`.

#### Scenario: Usuário member tenta consultar o log de decisões
- **WHEN** um usuário com `user_type = 'member'` tenta consultar o log de decisões
- **THEN** o sistema nega o acesso por não haver policy que autorize esse usuário
