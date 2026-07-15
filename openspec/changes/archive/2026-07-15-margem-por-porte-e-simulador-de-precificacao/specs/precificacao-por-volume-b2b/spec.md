## MODIFIED Requirements

### Requirement: Preço B2B sem taxa de canal
O sistema SHALL calcular o preço B2B de uma peça, para uma faixa de quantidade, aplicando sobre o custo total a margem efetiva B2B — resolvida a partir da margem-alvo daquela faixa de quantidade e da margem B2B da faixa de porte da peça, conforme o modo (`somar` ou `substituir`) configurado nessa faixa de porte —, sem aplicar nenhuma taxa de canal de marketplace.

#### Scenario: Preço B2B da Caixa Mandala em lote de 20 unidades
- **WHEN** o sistema calcula o preço B2B da Caixa Mandala para a faixa de quantidade mínima 20
- **THEN** o preço retornado é o custo total da peça multiplicado por (1 + margem efetiva B2B), sem dedução de taxa de canal

#### Scenario: Faixa de porte sem margem B2B configurada
- **WHEN** o sistema calcula o preço B2B de uma peça cuja faixa de porte não tem margem B2B configurada
- **THEN** a margem efetiva B2B é exatamente a margem-alvo da faixa de quantidade, preservando o preço calculado antes da existência da margem por porte

### Requirement: Preço B2B aplicável a peça simples ou composta
O sistema SHALL permitir calcular o preço B2B tanto para peças simples quanto para peças compostas, usando em ambos os casos o custo total já apurado pelo motor de cálculo (custo direto ou custo agregado, respectivamente) e a margem efetiva B2B resolvida a partir do porte da peça — automático para a peça simples, informado pelo usuário para a peça composta.

#### Scenario: Preço B2B de uma peça simples
- **WHEN** o sistema calcula o preço B2B de uma peça simples para uma faixa de quantidade
- **THEN** o cálculo usa o custo total dessa peça normalmente, sem exigir composição, aplicando a margem efetiva B2B do porte classificado automaticamente

#### Scenario: Preço B2B de uma peça composta
- **WHEN** o sistema calcula o preço B2B de uma peça composta cujo porte foi informado como G
- **THEN** o cálculo usa o custo agregado da composição e aplica a margem efetiva B2B resolvida a partir da faixa de porte G

## ADDED Requirements

### Requirement: Margem-alvo da faixa de volume é a base, nunca o resultado final
O sistema SHALL tratar a margem-alvo cadastrada em uma faixa de volume B2B como a margem **base** da resolução, e não necessariamente como a margem final aplicada, já que a faixa de porte da peça pode somá-la ou substituí-la.

#### Scenario: Mesma faixa de volume produz margens diferentes por porte
- **WHEN** o sistema calcula o preço B2B de uma peça P e de uma peça G para a mesma faixa de quantidade mínima 20, com portes que têm margens B2B distintas
- **THEN** as duas peças resultam em margens efetivas diferentes para a mesma faixa de volume
