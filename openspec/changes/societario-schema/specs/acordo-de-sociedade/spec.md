## ADDED Requirements

### Requirement: Registro versionado da regra de divisão de lucro
O sistema SHALL armazenar a regra de divisão de lucro vigente e as condições de saída de sócio como um registro versionado, criando um novo registro a cada mudança sem sobrescrever o anterior.

#### Scenario: Alteração da regra de divisão de lucro
- **WHEN** um Sócio/Owner atualiza a regra de divisão de lucro vigente
- **THEN** o sistema cria um novo registro com `valid_from = now()`, preservando o registro anterior no histórico

### Requirement: Regra vigente é a mais recente
O sistema SHALL considerar vigente o registro de acordo de sociedade cujo `valid_from` seja o mais recente dentre os que já ocorreram.

#### Scenario: Consulta da regra vigente
- **WHEN** um usuário consulta a regra de divisão de lucro vigente
- **THEN** o sistema retorna o registro com o maior `valid_from` menor ou igual ao momento atual

### Requirement: Acesso restrito a Owner e Sócio
O sistema SHALL permitir leitura e escrita do acordo de sociedade apenas a usuários com `user_type` `owner` ou `socio`.

#### Scenario: Usuário member tenta consultar o acordo
- **WHEN** um usuário com `user_type = 'member'` tenta consultar o acordo de sociedade
- **THEN** o sistema nega o acesso por não haver policy que autorize esse usuário
