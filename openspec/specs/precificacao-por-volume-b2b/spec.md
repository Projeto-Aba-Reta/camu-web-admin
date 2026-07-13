# precificacao-por-volume-b2b

## Purpose

Faixas de precificação B2B por quantidade mínima, versionadas por vigência, e cálculo do preço B2B (margem-alvo por faixa sobre o custo total, sem taxa de canal), aplicável a peças simples ou compostas, com escrita restrita ao Financeiro.

## Requirements

### Requirement: Faixas de desconto B2B por quantidade mínima versionadas
O sistema SHALL manter faixas de precificação B2B, cada uma com uma quantidade mínima e uma margem-alvo própria, como registros versionados por `valid_from`, sem sobrescrever registros existentes ao alterar uma faixa.

#### Scenario: Cadastro de faixa para lote de 20+ unidades
- **WHEN** um usuário autorizado cadastra uma faixa B2B com quantidade mínima 20 e margem-alvo 25%
- **THEN** o sistema cria o registro de faixa versionado, disponível para uso no motor de cálculo

#### Scenario: Ajuste de margem-alvo de uma faixa existente
- **WHEN** a margem-alvo de uma faixa B2B já cadastrada é alterada
- **THEN** o sistema cria um novo registro de faixa com `valid_from = now()`, preservando o anterior

### Requirement: Preço B2B sem taxa de canal
O sistema SHALL calcular o preço B2B de uma peça, para uma faixa de quantidade, aplicando apenas a margem-alvo daquela faixa sobre o custo total, sem aplicar nenhuma taxa de canal de marketplace.

#### Scenario: Preço B2B da Caixa Mandala em lote de 20 unidades
- **WHEN** o sistema calcula o preço B2B da Caixa Mandala para a faixa de quantidade mínima 20
- **THEN** o preço retornado é o custo total da peça multiplicado por (1 + margem-alvo da faixa), sem dedução de taxa de canal

### Requirement: Preço B2B aplicável a peça simples ou composta
O sistema SHALL permitir calcular o preço B2B tanto para peças simples quanto para peças compostas, usando em ambos os casos o custo total já apurado pelo motor de cálculo (custo direto ou custo agregado, respectivamente).

#### Scenario: Preço B2B de uma peça simples
- **WHEN** o sistema calcula o preço B2B de uma peça simples para uma faixa de quantidade
- **THEN** o cálculo usa o custo total dessa peça normalmente, sem exigir composição

### Requirement: Acesso restrito a Owner, Sócio e role Financeiro
O sistema SHALL permitir leitura das faixas de precificação B2B a `owner`/`socio` ou role `financeiro`/`producao`, e escrita apenas a `owner`/`socio` ou role `financeiro` — mesma regra de acesso já usada para taxas por canal.

#### Scenario: Usuário de Produção tenta alterar uma faixa B2B
- **WHEN** um usuário com apenas a role `producao` tenta inserir ou alterar uma faixa de precificação B2B
- **THEN** o sistema rejeita a escrita, pois faixas B2B são responsabilidade financeira
