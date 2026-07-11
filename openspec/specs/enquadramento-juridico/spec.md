# enquadramento-juridico

## Purpose

Manter um registro versionado e histórico do tipo de enquadramento jurídico vigente (MEI ou ME), incluindo CNPJ e titular, restrito a Owner e Sócio.

## Requirements

### Requirement: Registro versionado do tipo de PJ vigente
O sistema SHALL armazenar o tipo de PJ vigente (`mei` ou `me`), CNPJ e titular (quando aplicável), criando um novo registro versionado a cada mudança de enquadramento.

#### Scenario: Migração de MEI para ME
- **WHEN** um Sócio/Owner registra a migração do enquadramento de `mei` para `me`
- **THEN** o sistema cria um novo registro de enquadramento com `valid_from = now()`, preservando o registro anterior no histórico

### Requirement: Titular obrigatório apenas para MEI
Quando o enquadramento vigente for `mei`, o sistema SHALL exigir um titular associado; quando for `me`, o titular SHALL ser opcional.

#### Scenario: Registro de enquadramento MEI sem titular
- **WHEN** um usuário tenta registrar um enquadramento `mei` sem informar o titular
- **THEN** o sistema rejeita o registro por exigir titular quando o tipo é `mei`

### Requirement: Enquadramento vigente é o mais recente
O sistema SHALL considerar vigente o registro de enquadramento jurídico cujo `valid_from` seja o mais recente dentre os que já ocorreram.

#### Scenario: Consulta do enquadramento atual
- **WHEN** um usuário consulta o enquadramento jurídico vigente
- **THEN** o sistema retorna o registro com o maior `valid_from` menor ou igual ao momento atual

### Requirement: Acesso restrito a Owner e Sócio
O sistema SHALL permitir leitura e escrita do enquadramento jurídico apenas a usuários com `user_type` `owner` ou `socio`.

#### Scenario: Usuário member tenta consultar o enquadramento
- **WHEN** um usuário com `user_type = 'member'` tenta consultar o enquadramento jurídico vigente
- **THEN** o sistema nega o acesso por não haver policy que autorize esse usuário
