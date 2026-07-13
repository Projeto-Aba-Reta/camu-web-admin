# motor-de-calculo-de-preco

## Purpose

Cálculo de custo, classificação de porte (P/M/G) e projeção de preço sugerido/margem por canal a partir de peso e tempo de impressão informados pelo fatiador, com histórico de cada cálculo executado.

## Requirements

### Requirement: Cálculo de custo a partir de peso e tempo de impressão
Dado peso em gramas e tempo de impressão em horas — informados diretamente ou derivados de uma ficha de fatiamento cadastrada para a peça e a impressora — e uma impressora, o sistema SHALL calcular o custo total como a soma de custo de filamento (peso × preço por kg vigente), custo de energia (tempo × consumo médio × preço por kWh vigente), depreciação (tempo × depreciação por hora vigente da impressora), reserva de falha (percentual vigente sobre o subtotal) e custo de embalagem vigente.

#### Scenario: Cálculo de peça pequena com peso e tempo digitados
- **WHEN** um usuário solicita o cálculo para 15g e 2,1h na Ender-3 V3 SE, digitados manualmente, com os parâmetros de referência vigentes
- **THEN** o sistema retorna o custo total como a soma dos cinco componentes, cada um individualizado no resultado

#### Scenario: Cálculo a partir de uma ficha de fatiamento cadastrada
- **WHEN** um usuário solicita o cálculo informando uma peça e uma impressora que já têm ficha de fatiamento cadastrada, sem digitar peso ou tempo
- **THEN** o sistema deriva o peso e o tempo a partir da ficha de fatiamento e calcula o custo total normalmente, registrando qual ficha originou o cálculo

### Requirement: Classificação automática de porte P/M/G
O sistema SHALL classificar o porte sugerido de uma peça (P, M ou G) comparando o peso e o tempo de impressão informados contra as faixas de referência vigentes, sinalizando quando os valores não se encaixam claramente em nenhuma faixa.

#### Scenario: Peça dentro da faixa M
- **WHEN** peso e tempo informados estão dentro da faixa de referência de M
- **THEN** o sistema retorna `M` como porte sugerido

#### Scenario: Peça com peso e tempo em faixas conflitantes
- **WHEN** o peso informado corresponde à faixa P mas o tempo informado corresponde à faixa G
- **THEN** o sistema sinaliza o porte sugerido como ambíguo e retorna ambas as faixas candidatas, sem escolher uma automaticamente

### Requirement: Preço sugerido por canal ativo
O sistema SHALL calcular, para cada canal com taxa vigente cadastrada, o preço sugerido a partir do custo total, da margem-alvo B2C vigente e da taxa desse canal (percentual e fixa), e a margem líquida resultante.

#### Scenario: Preço sugerido para múltiplos canais
- **WHEN** um cálculo de preço é executado com taxas vigentes cadastradas para Mercado Livre e Shopee e margem-alvo B2C vigente maior que zero
- **THEN** o sistema retorna o preço sugerido e a margem para cada um dos dois canais, calculados independentemente, cada um já incorporando a margem-alvo antes da taxa do canal

#### Scenario: Margem-alvo zerada preserva o preço de equilíbrio
- **WHEN** um cálculo de preço é executado com margem-alvo B2C vigente igual a zero
- **THEN** o sistema retorna o mesmo preço de equilíbrio (custo ÷ (1 − taxa%) + taxa fixa) calculado antes da existência do parâmetro de margem-alvo

### Requirement: Persistência do histórico de cálculos
O sistema SHALL registrar cada cálculo executado, incluindo os inputs (peso, tempo, impressora), os parâmetros vigentes usados, o breakdown de custo, o porte sugerido e os preços por canal, sem recalcular ou sobrescrever esse registro posteriormente.

#### Scenario: Consulta de um cálculo já executado
- **WHEN** um usuário consulta um cálculo de preço registrado anteriormente
- **THEN** o sistema retorna exatamente o resultado apurado no momento do cálculo, mesmo que os parâmetros de custo tenham mudado depois

### Requirement: Acesso ao motor de cálculo por Financeiro e Produção
O sistema SHALL permitir que usuários `owner`/`socio` ou com role `financeiro`/`producao` executem e consultem cálculos de preço, registrando o autor de cada execução.

#### Scenario: Execução de cálculo por usuário de Produção
- **WHEN** um usuário com role `producao` executa um cálculo de preço
- **THEN** o sistema processa o cálculo normalmente e registra esse usuário como `created_by`

### Requirement: Cálculo de custo agregado para peça composta
O sistema SHALL calcular o custo total de uma peça composta como a soma, para cada componente cadastrado, do custo do cálculo de preço mais recente daquele componente multiplicado pela sua quantidade na composição, retornando também o breakdown individual de cada componente.

#### Scenario: Cálculo do sistema completo da Caixa Mandala
- **WHEN** um usuário solicita o cálculo de preço da peça composta "Caixa Mandala"
- **THEN** o sistema retorna o custo total agregado e, junto, o custo e a quantidade de cada componente que compõe esse total

### Requirement: Preço B2B por faixa de volume no mesmo resultado de cálculo
O sistema SHALL incluir, no resultado de um cálculo de preço, o preço B2B calculado para cada faixa de volume vigente, ao lado dos preços B2C por canal, usando o custo total da peça (direto ou agregado, conforme o tipo da peça).

#### Scenario: Resultado com preços B2C e B2B lado a lado
- **WHEN** um cálculo de preço é executado com taxas de canal e faixas B2B vigentes cadastradas
- **THEN** o sistema retorna, no mesmo resultado, o preço sugerido por canal (B2C) e o preço sugerido por faixa de quantidade (B2B)
