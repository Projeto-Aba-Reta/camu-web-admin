# parametros-de-custo

## Purpose

Parâmetros globais de custo (preço do filamento, energia, consumo médio, reserva de falha, embalagem) versionados no tempo, com vigência rastreável e consultável para auditoria.

## Requirements

### Requirement: Parâmetros de custo versionados por vigência
O sistema SHALL armazenar os parâmetros globais de custo (preço do filamento por kg, custo de energia por kWh, consumo médio de impressão em watts, percentual de reserva para falha, custo de embalagem e percentual de margem-alvo B2C) como registros imutáveis com `valid_from`, nunca sobrescrevendo um registro existente ao alterar um valor.

#### Scenario: Owner altera o preço do filamento
- **WHEN** o Owner registra um novo preço de filamento por kg
- **THEN** o sistema cria um novo registro de parâmetros com `valid_from = now()`, preservando o registro anterior sem alteração

#### Scenario: Owner define a margem-alvo B2C
- **WHEN** o Owner registra um novo percentual de margem-alvo B2C
- **THEN** o sistema cria um novo registro de parâmetros com `valid_from = now()`, preservando o registro anterior, e o novo percentual passa a ser usado pelo motor de cálculo de preço a partir desse momento

#### Scenario: Margem-alvo ausente equivale a zero
- **WHEN** nenhum valor de margem-alvo B2C foi registrado ainda
- **THEN** o sistema considera a margem-alvo vigente como zero, preservando o comportamento de preço de equilíbrio existente antes desse parâmetro

### Requirement: Parâmetro vigente é o mais recente
O sistema SHALL considerar vigente, em qualquer cálculo, o registro de parâmetros de custo cujo `valid_from` seja o mais recente dentre os que já ocorreram.

#### Scenario: Cálculo consulta parâmetros atuais
- **WHEN** o motor de cálculo busca os parâmetros de custo vigentes
- **THEN** o sistema retorna o registro com o maior `valid_from` menor ou igual ao momento atual

### Requirement: Histórico de parâmetros consultável
O sistema SHALL permitir consultar todos os registros históricos de parâmetros de custo ordenados por vigência, para permitir auditoria de quando cada valor mudou.

#### Scenario: Consulta de histórico de energia
- **WHEN** um usuário autorizado solicita o histórico do custo de energia por kWh
- **THEN** o sistema retorna todos os registros de parâmetros ordenados por `valid_from` decrescente

### Requirement: Acesso restrito a Owner, Sócio e role Precificação
O sistema SHALL permitir leitura dos parâmetros de custo a usuários com `user_type` `owner`/`socio` ou com a role `precificacao`/`producao`, e permitir escrita apenas a `owner`/`socio` ou role `precificacao`.

#### Scenario: Usuário de Produção tenta alterar parâmetro
- **WHEN** um usuário com apenas a role `producao` tenta inserir um novo registro de parâmetros de custo
- **THEN** o sistema rejeita a escrita por Row Level Security, pois `producao` tem só leitura sobre parâmetros financeiros

#### Scenario: Usuário sem role de domínio tenta ler parâmetros
- **WHEN** um usuário `member` sem role `precificacao` ou `producao` tenta consultar os parâmetros de custo
- **THEN** o sistema nega a leitura por não haver policy que autorize esse usuário
