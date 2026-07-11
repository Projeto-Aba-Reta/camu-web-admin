# Spec: Tela de Enquadramento Jurídico

## Purpose

Define o comportamento da tela de enquadramento jurídico, que exibe o tipo de PJ vigente (MEI ou ME) com histórico de mudanças, o painel de gatilhos de migração e as ações de registrar migração e marcar/reverter gatilhos.

## Requirements

### Requirement: Exibição do enquadramento vigente com histórico
A tela SHALL exibir o tipo de PJ vigente (MEI ou ME), CNPJ e titular (quando aplicável), com acesso ao histórico de mudanças de enquadramento.

#### Scenario: Consulta do enquadramento vigente
- **WHEN** um Sócio/Owner acessa a tela de enquadramento jurídico
- **THEN** a tela exibe o tipo de PJ vigente, CNPJ e titular (se MEI), com um link para o histórico

### Requirement: Registro de migração de enquadramento
A tela SHALL permitir registrar uma migração de enquadramento (de MEI para ME), criando um novo registro versionado.

#### Scenario: Registro de migração para ME
- **WHEN** um Sócio/Owner registra a migração do enquadramento de MEI para ME
- **THEN** o sistema cria o novo registro e a tela passa a exibi-lo como vigente

### Requirement: Painel de gatilhos de migração como cards de status
A tela SHALL exibir os 4 gatilhos de migração como cards individuais, cada um com seu status (pendente/atingido) e, quando atingido, a data correspondente.

#### Scenario: Consulta do painel de gatilhos
- **WHEN** um Sócio/Owner acessa a tela de enquadramento jurídico
- **THEN** a tela exibe 4 cards, um por gatilho, com o status atual de cada um

### Requirement: Ação de marcar ou reverter gatilho
A tela SHALL permitir marcar um gatilho como atingido, e reverter um gatilho atingido para pendente mediante preenchimento de uma nota.

#### Scenario: Marcar gatilho como atingido
- **WHEN** um Sócio/Owner marca o gatilho de faturamento próximo do teto como atingido
- **THEN** o sistema atualiza o status desse gatilho e exibe a data da marcação no card correspondente

#### Scenario: Reverter gatilho sem nota
- **WHEN** um Sócio/Owner tenta reverter um gatilho atingido para pendente sem preencher a nota
- **THEN** a tela bloqueia a ação até que a nota seja preenchida

### Requirement: Acesso restrito a Owner e Sócio
A tela SHALL ser acessível apenas a usuários com `user_type` `owner` ou `socio`, independentemente de terem a role `societario` atribuída.

#### Scenario: Member com a role societario atribuída tenta acessar
- **WHEN** um usuário com `user_type = 'member'` e a role `societario` atribuída tenta acessar a tela de enquadramento jurídico
- **THEN** o sistema nega o acesso, pois a permissão depende do `user_type`, não da role atribuída
