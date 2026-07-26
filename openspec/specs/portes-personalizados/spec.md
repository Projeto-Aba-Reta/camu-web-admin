# portes-personalizados

## Purpose

Cadastro dos portes de tamanho usados na régua de precificação: os portes fixos de sistema P/M/G e portes personalizados adicionais (ex.: `GG`), cada um com código curto estável, nome de exibição e ordem, disponíveis para cadastrar faixas de peso/tempo, configurar margens e classificar peças. Escrita restrita ao domínio de precificação.

## Requirements

### Requirement: Cadastro de portes além dos fixos P/M/G
O sistema SHALL permitir cadastrar portes de tamanho além de P, M e G, cada um com um código curto estável, um nome de exibição e uma ordem na régua de tamanho, disponíveis para uso no cadastro de faixas de porte e na classificação de peças.

#### Scenario: Cadastro de um porte GG
- **WHEN** um usuário autorizado cadastra um porte com código `GG`, nome "Extra Grande" e ordem posterior à do porte G
- **THEN** o sistema registra o porte e ele passa a estar disponível para cadastrar faixa de peso/tempo, configurar margens e classificar peças

#### Scenario: Porte recém-criado sem faixa cadastrada
- **WHEN** um porte personalizado foi criado mas ainda não tem faixa de peso/tempo vigente
- **THEN** o porte não participa da classificação automática, mas já pode ser escolhido manualmente ao calcular o preço de uma peça

### Requirement: Portes de sistema P/M/G sempre presentes e protegidos
O sistema SHALL manter P, M e G como portes de sistema sempre presentes, cujo código não pode ser alterado e que não podem ser removidos, permitindo apenas a edição do seu nome de exibição, ordem, faixa e margens.

#### Scenario: Tentativa de remover um porte de sistema
- **WHEN** um usuário tenta remover o porte M
- **THEN** o sistema rejeita a remoção, informando que P, M e G são portes de sistema

#### Scenario: Edição do nome de exibição de um porte de sistema
- **WHEN** um usuário altera o nome de exibição do porte G de "Grande" para "Grande (G)"
- **THEN** o sistema aceita a alteração, mantendo o código `G` inalterado

### Requirement: Código de porte estável, normalizado e sem separador de ambiguidade
O sistema SHALL validar o código de um porte como uma sequência curta de caracteres alfanuméricos maiúsculos, normalizando a entrada, e SHALL rejeitar códigos que contenham o caractere separador usado na serialização de porte ambíguo (`/`), garantindo que o código continue servindo como rótulo curto e como identidade estável de peças e cálculos.

#### Scenario: Normalização do código informado
- **WHEN** um usuário informa o código de porte como " gg "
- **THEN** o sistema registra o código como `GG`, sem espaços e em maiúsculas

#### Scenario: Rejeição de código com barra
- **WHEN** um usuário tenta cadastrar um porte com código `P/G`
- **THEN** o sistema rejeita o cadastro com uma mensagem de validação, pois `/` é reservado para separar portes candidatos em um cálculo ambíguo

#### Scenario: Rejeição de código duplicado
- **WHEN** um usuário tenta cadastrar um porte com um código que já existe
- **THEN** o sistema rejeita o cadastro, pois o código é a identidade única do porte

### Requirement: Remoção de porte personalizado sem referências
O sistema SHALL permitir remover um porte personalizado apenas quando nenhuma peça e nenhuma faixa de porte o referenciarem, preservando a integridade das peças e cálculos históricos.

#### Scenario: Remoção de porte personalizado em uso
- **WHEN** um usuário tenta remover um porte personalizado que está associado a pelo menos uma peça
- **THEN** o sistema rejeita a remoção, informando que há peças usando esse porte

#### Scenario: Remoção de porte personalizado sem uso
- **WHEN** um usuário remove um porte personalizado que não está associado a nenhuma peça nem faixa
- **THEN** o sistema remove o porte, que deixa de aparecer como opção nos cadastros

### Requirement: Acesso restrito a Owner, Sócio e role Precificação
O sistema SHALL permitir escrita de portes (cadastro, edição, remoção) apenas a usuários `owner`/`socio` ou com a role `precificacao`, e leitura a `owner`/`socio` ou role `precificacao`/`producao` — mesma regra de acesso já aplicada às faixas de porte.

#### Scenario: Usuário de Produção tenta cadastrar um porte
- **WHEN** um usuário com apenas a role `producao` tenta cadastrar um novo porte
- **THEN** o sistema rejeita a escrita, pois o cadastro de portes é responsabilidade de Precificação
