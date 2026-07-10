## ADDED Requirements

### Requirement: Catálogo fixo dos 4 gatilhos de migração
O sistema SHALL manter exatamente um registro para cada um dos 4 gatilhos de migração de MEI para ME (faturamento próximo do teto, lançamento de assinatura recorrente, necessidade de mais de 1 funcionário, entrada de investimento externo), cada um com status `pendente` ou `atingido`.

#### Scenario: Consulta dos gatilhos existentes
- **WHEN** um usuário consulta o painel de gatilhos de migração
- **THEN** o sistema retorna os 4 gatilhos, cada um com seu status atual

### Requirement: Marcação de gatilho como atingido registra data
Ao marcar um gatilho como `atingido`, o sistema SHALL registrar a data/hora em que essa mudança ocorreu.

#### Scenario: Gatilho de assinatura recorrente marcado como atingido
- **WHEN** um Sócio/Owner marca o gatilho `lancamento_assinatura_recorrente` como `atingido`
- **THEN** o sistema registra `reached_at` com o momento da marcação

### Requirement: Gatilho pode ser revertido para pendente com nota
O sistema SHALL permitir reverter um gatilho de `atingido` para `pendente`, exigindo uma nota explicando o motivo da reversão.

#### Scenario: Reversão de gatilho marcado por engano
- **WHEN** um gatilho marcado como `atingido` por engano é revertido para `pendente`
- **THEN** o sistema exige uma nota e limpa o campo `reached_at`

### Requirement: Acesso restrito a Owner e Sócio
O sistema SHALL permitir leitura e escrita dos gatilhos de migração apenas a usuários com `user_type` `owner` ou `socio`.

#### Scenario: Usuário member tenta consultar os gatilhos
- **WHEN** um usuário com `user_type = 'member'` tenta consultar os gatilhos de migração
- **THEN** o sistema nega o acesso por não haver policy que autorize esse usuário
