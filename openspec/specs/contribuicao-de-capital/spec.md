# contribuicao-de-capital

## Purpose

Registrar e manter o histórico imutável das contribuições de capital (aportes) de cada sócio, restrito a Owner e Sócio.

## Requirements

### Requirement: Registro de contribuição de capital por sócio
O sistema SHALL permitir registrar um aporte de capital de um sócio, com valor, data e referência de comprovante.

#### Scenario: Registro do aporte inicial de um sócio
- **WHEN** um Sócio/Owner registra o aporte inicial de um dos 3 sócios com valor, data e referência do comprovante de PIX
- **THEN** o sistema persiste o registro de contribuição vinculado a esse sócio

### Requirement: Histórico de contribuições por sócio
O sistema SHALL permitir consultar todas as contribuições de capital registradas, agrupáveis por sócio.

#### Scenario: Consulta de contribuições de um sócio específico
- **WHEN** um usuário autorizado consulta as contribuições de capital de um dos sócios
- **THEN** o sistema retorna todos os registros de contribuição vinculados a esse sócio

### Requirement: Contribuições não são editáveis, apenas complementadas
Uma contribuição de capital já registrada SHALL permanecer inalterada; uma correção SHALL ser feita através de um novo registro, não pela edição do original.

#### Scenario: Correção de valor registrado incorretamente
- **WHEN** um usuário identifica que uma contribuição foi registrada com valor incorreto
- **THEN** o sistema não oferece edição do registro original, apenas a criação de um novo registro complementar ou corretivo

### Requirement: Acesso restrito a Owner e Sócio
O sistema SHALL permitir leitura e escrita das contribuições de capital apenas a usuários com `user_type` `owner` ou `socio`.

#### Scenario: Usuário member tenta consultar contribuições
- **WHEN** um usuário com `user_type = 'member'` tenta consultar as contribuições de capital
- **THEN** o sistema nega o acesso por não haver policy que autorize esse usuário
