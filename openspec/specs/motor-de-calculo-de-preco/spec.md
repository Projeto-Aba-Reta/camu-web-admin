# motor-de-calculo-de-preco

## Purpose

Cálculo de custo, classificação de porte (P/M/G) e projeção de preço sugerido/margem por canal a partir de peso e tempo de impressão informados pelo fatiador, com histórico de cada cálculo executado.

## Requirements

### Requirement: Cálculo de custo a partir de peso e tempo de impressão
Dado peso em gramas e tempo de impressão em horas — informados diretamente ou derivados de uma ficha de fatiamento cadastrada para a peça e a impressora — e uma impressora, o sistema SHALL calcular o custo total como a soma de custo de filamento, custo de energia (tempo × consumo médio × preço por kWh vigente), depreciação (tempo × depreciação por hora vigente da impressora), reserva de falha (percentual vigente sobre o subtotal) e custo de embalagem vigente. O custo de filamento SHALL ser calculado por linha de material: quando a linha (ou a parte) referencia um insumo de filamento do estoque, usa o custo por kg desse insumo; quando não há vínculo, usa o preço por kg global vigente. Cada cálculo SHALL registrar, por linha, a origem do preço de filamento usado (insumo vinculado ou preço global).

#### Scenario: Cálculo de peça pequena com peso e tempo digitados
- **WHEN** um usuário solicita o cálculo para 15g e 2,1h na Ender-3 V3 SE, digitados manualmente, com os parâmetros de referência vigentes e sem filamento do estoque vinculado
- **THEN** o sistema retorna o custo total como a soma dos cinco componentes, cada um individualizado no resultado, usando o preço global de filamento por kg

#### Scenario: Cálculo com filamento do estoque vinculado
- **WHEN** um usuário solicita o cálculo para uma peça cuja ficha de fatiamento tem a linha de material vinculada ao insumo "Filamento PLA Vermelho", com custo por kg diferente do global
- **THEN** o sistema calcula o custo de filamento dessa linha pelo custo por kg do insumo vinculado e registra que a origem do preço foi o insumo

#### Scenario: Cálculo a partir de uma ficha de fatiamento cadastrada
- **WHEN** um usuário solicita o cálculo informando uma peça e uma impressora que já têm ficha de fatiamento cadastrada, sem digitar peso ou tempo
- **THEN** o sistema deriva o peso e o tempo a partir da ficha de fatiamento e calcula o custo total normalmente, registrando qual ficha originou o cálculo

### Requirement: Classificação automática de porte P/M/G
O sistema SHALL classificar o porte sugerido de uma peça comparando o peso e o tempo de impressão informados contra as faixas de referência vigentes de todos os portes cadastrados, ordenados pela ordem definida em cada porte, sinalizando quando os valores não se encaixam claramente em nenhuma faixa. A classificação SHALL considerar qualquer porte cadastrado — os fixos P/M/G e os personalizados —, e não um conjunto fechado de três valores.

#### Scenario: Peça dentro da faixa M
- **WHEN** peso e tempo informados estão dentro da faixa de referência de M
- **THEN** o sistema retorna `M` como porte sugerido

#### Scenario: Peça classificada em um porte personalizado
- **WHEN** existe um porte personalizado `GG` com faixa vigente e peso e tempo informados caem dentro dela
- **THEN** o sistema retorna `GG` como porte sugerido

#### Scenario: Peça com peso e tempo em faixas conflitantes
- **WHEN** o peso informado corresponde à faixa de um porte mas o tempo informado corresponde à faixa de outro porte
- **THEN** o sistema sinaliza o porte sugerido como ambíguo e retorna ambos os portes candidatos na ordem cadastrada, sem escolher um automaticamente

### Requirement: Preço sugerido por canal ativo
O sistema SHALL calcular, para cada canal com taxa vigente cadastrada, o preço sugerido a partir do custo total, da margem efetiva B2C da peça — resolvida a partir da margem-alvo B2C vigente e da margem B2C da faixa de porte da peça, conforme o modo (`somar` ou `substituir`) configurado nessa faixa — e da taxa desse canal (percentual e fixa), e a margem líquida resultante.

#### Scenario: Preço sugerido para múltiplos canais
- **WHEN** um cálculo de preço é executado com taxas vigentes cadastradas para Mercado Livre e Shopee e margem efetiva B2C maior que zero
- **THEN** o sistema retorna o preço sugerido e a margem para cada um dos dois canais, calculados independentemente, cada um já incorporando a margem efetiva B2C antes da taxa do canal

#### Scenario: Margem da faixa de porte somada à margem-alvo
- **WHEN** um cálculo é executado para uma peça classificada como G, com margem-alvo B2C vigente de 15% e margem B2C de 20% no modo `somar` na faixa G
- **THEN** o preço de cada canal é calculado sobre uma margem efetiva de 35%

#### Scenario: Margem da faixa de porte substituindo a margem-alvo
- **WHEN** um cálculo é executado para uma peça classificada como P, com margem-alvo B2C vigente de 15% e margem B2C de 8% no modo `substituir` na faixa P
- **THEN** o preço de cada canal é calculado sobre uma margem efetiva de 8%, ignorando a margem-alvo global

#### Scenario: Margem-alvo zerada preserva o preço de equilíbrio
- **WHEN** um cálculo de preço é executado com margem-alvo B2C vigente igual a zero e a faixa de porte da peça sem margem configurada
- **THEN** o sistema retorna o mesmo preço de equilíbrio (custo ÷ (1 − taxa%) + taxa fixa) calculado antes da existência dos parâmetros de margem

### Requirement: Persistência do histórico de cálculos
O sistema SHALL registrar cada cálculo executado, incluindo os inputs (peso, tempo, impressora), os parâmetros vigentes usados, o breakdown de custo, o porte sugerido e os preços por canal, sem recalcular ou sobrescrever esse registro posteriormente.

#### Scenario: Consulta de um cálculo já executado
- **WHEN** um usuário consulta um cálculo de preço registrado anteriormente
- **THEN** o sistema retorna exatamente o resultado apurado no momento do cálculo, mesmo que os parâmetros de custo tenham mudado depois

### Requirement: Acesso ao motor de cálculo por Precificação e Produção
O sistema SHALL permitir que usuários `owner`/`socio` ou com role `precificacao`/`producao` executem e consultem cálculos de preço, registrando o autor de cada execução.

#### Scenario: Execução de cálculo por usuário de Produção
- **WHEN** um usuário com role `producao` executa um cálculo de preço
- **THEN** o sistema processa o cálculo normalmente e registra esse usuário como `created_by`

### Requirement: Cálculo de custo agregado para peça composta
O sistema SHALL calcular o custo total de uma peça composta como a soma de duas parcelas: (1) para cada parte inline, o custo próprio da parte — custo de filamento (peso da parte × custo por kg do insumo vinculado, ou preço global quando não vinculado), custo de energia, depreciação e reserva de falha a partir da impressora e do tempo daquela parte — multiplicado pela quantidade da parte; e (2) para cada componente referenciado do catálogo, o custo do cálculo de preço mais recente daquele componente, excluída a embalagem desse componente, multiplicado pela sua quantidade. A reserva de falha SHALL incidir por peça impressa (cada parte e cada componente carrega a sua). O custo de embalagem vigente SHALL ser somado uma única vez ao conjunto (produto final embalado uma vez). O sistema SHALL retornar também o breakdown individual de cada parte e de cada componente. O cálculo de uma peça composta SHALL exigir um porte informado explicitamente pelo usuário, já que uma peça composta não tem um único peso e tempo a classificar automaticamente e o porte determina a margem aplicada.

#### Scenario: Cálculo do sistema completo da Caixa Mandala com partes inline
- **WHEN** um usuário solicita o cálculo de preço da peça composta "Caixa Mandala", formada pelas partes inline decágono, cunhas e travas, informando o porte G
- **THEN** o sistema retorna o custo total agregado, o breakdown de filamento/energia/depreciação/reserva de falha de cada parte multiplicado pela sua quantidade, a embalagem aplicada uma única vez ao conjunto, e os preços projetados com a margem efetiva da faixa G

#### Scenario: Cálculo de peça composta mista
- **WHEN** um usuário solicita o cálculo de uma peça composta com uma parte inline "Base" e um componente do catálogo "Tampa personalizada" (quantidade 1), informando o porte M
- **THEN** o sistema soma o custo próprio da parte "Base" com o custo do cálculo mais recente da "Tampa personalizada", aplica reserva de falha e embalagem uma vez, e retorna o breakdown de cada fonte

#### Scenario: Parte com filamento do estoque em peça composta
- **WHEN** uma parte inline de uma peça composta tem o insumo "Filamento PLA Branco" vinculado
- **THEN** o custo de filamento dessa parte é calculado pelo custo por kg desse insumo, e não pelo preço global

#### Scenario: Cálculo de peça composta sem porte informado
- **WHEN** um usuário solicita o cálculo de preço de uma peça composta sem informar o porte
- **THEN** o sistema rejeita o cálculo com uma mensagem indicando que o porte precisa ser escolhido, e nenhum registro é salvo no histórico

### Requirement: Preço B2B por faixa de volume no mesmo resultado de cálculo
O sistema SHALL incluir, no resultado de um cálculo de preço, o preço B2B calculado para cada faixa de volume vigente, ao lado dos preços B2C por canal, usando o custo total da peça (direto ou agregado, conforme o tipo da peça) e a margem efetiva B2B daquela faixa — resolvida a partir da margem-alvo da faixa de volume e da margem B2B da faixa de porte da peça, conforme o modo configurado nessa faixa de porte.

#### Scenario: Resultado com preços B2C e B2B lado a lado
- **WHEN** um cálculo de preço é executado com taxas de canal e faixas B2B vigentes cadastradas
- **THEN** o sistema retorna, no mesmo resultado, o preço sugerido por canal (B2C) e o preço sugerido por faixa de quantidade (B2B)

#### Scenario: Margem B2B do porte substituindo a margem de cada faixa de volume
- **WHEN** um cálculo é executado para uma peça G cuja faixa de porte tem margem B2B de 10% no modo `substituir`, existindo faixas de volume vigentes de 10 unidades (margem-alvo 8%) e 50 unidades (margem-alvo 5%)
- **THEN** as duas faixas de volume têm o preço calculado sobre uma margem efetiva de 10%

#### Scenario: Margem B2B do porte somada à margem de cada faixa de volume
- **WHEN** um cálculo é executado para uma peça G cuja faixa de porte tem margem B2B de 10% no modo `somar`, existindo faixas de volume vigentes de 10 unidades (margem-alvo 8%) e 50 unidades (margem-alvo 5%)
- **THEN** a faixa de 10 unidades é calculada sobre uma margem efetiva de 18% e a de 50 unidades sobre 15%

### Requirement: Porte resolvido é obrigatório para salvar um cálculo
O sistema SHALL exigir um porte resolvido (P, M ou G) para salvar qualquer cálculo de preço no histórico, seja ele derivado da classificação automática, escolhido pelo usuário para desfazer uma ambiguidade, ou informado explicitamente no caso de peça composta. Registros de cálculo criados antes desta regra SHALL permanecer inalterados, sem recálculo nem migração.

#### Scenario: Porte ambíguo resolvido pelo usuário altera a margem aplicada
- **WHEN** o motor sinaliza ambiguidade entre P e G e o usuário escolhe G
- **THEN** o sistema recalcula os preços usando a margem efetiva da faixa G — e não apenas rotula o cálculo como G — antes de salvar

#### Scenario: Cálculo antigo sem porte permanece consultável
- **WHEN** um usuário consulta no histórico um cálculo de peça composta salvo antes desta regra, sem porte registrado
- **THEN** o sistema exibe o snapshot original do cálculo normalmente, sem recalcular nem exigir porte

### Requirement: Margem efetiva registrada no snapshot do cálculo
O sistema SHALL registrar, em cada cálculo salvo, a margem efetiva aplicada e sua origem — margem-alvo base, margem da faixa de porte e modo (`somar` ou `substituir`) —, tanto para o preço B2C quanto para cada faixa de volume B2B, de modo que o histórico permita auditar de onde veio o preço mesmo depois que as faixas de porte forem alteradas.

#### Scenario: Auditoria de um preço após mudança na margem do porte
- **WHEN** um usuário consulta um cálculo salvo antes de uma alteração na margem da faixa G
- **THEN** o sistema exibe a margem efetiva registrada naquele cálculo e sua composição, e não a margem que a faixa G tem hoje
