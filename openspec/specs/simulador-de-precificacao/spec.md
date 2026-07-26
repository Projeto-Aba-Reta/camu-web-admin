# simulador-de-precificacao

## Purpose

Painel de simulação na tela de configuração de precificação que expõe a fórmula do motor de cálculo passo a passo, com as taxas vigentes e com os valores em edição ainda não salvos, permitindo comparar o preço atual com o preço projetado de uma peça de exemplo sem persistir nada.

## Requirements

### Requirement: Fórmula de precificação expandida passo a passo
O sistema SHALL exibir, no simulador, a fórmula de precificação expandida com os valores substituídos: a soma dos cinco componentes de custo até o custo total, a composição da margem efetiva (margem-alvo base, margem da faixa de porte e modo aplicado) e a projeção final de preço por canal e por faixa de volume, com cada operando visível.

#### Scenario: Fórmula de uma peça simulada
- **WHEN** um usuário informa no simulador uma peça de exemplo de 40g, 3,2h na Ender-3 V3 SE
- **THEN** o simulador exibe o custo como a soma explícita dos cinco componentes, a margem efetiva com sua origem (ex.: "15% alvo + 10% do porte M = 25%") e o preço de cada canal como a expressão `custo × (1 + margem efetiva) ÷ (1 − taxa%) + taxa fixa` com os números substituídos

#### Scenario: Fórmula B2B sem taxa de canal
- **WHEN** o simulador projeta o preço de uma faixa de volume B2B
- **THEN** a fórmula exibida é `custo × (1 + margem efetiva B2B)`, sem nenhum fator de taxa de canal

### Requirement: Simulação com valores em edição ainda não salvos
O sistema SHALL usar, na simulação, os valores que estão preenchidos nos formulários da tela de configuração mas ainda não foram salvos, sobrepondo-os aos parâmetros vigentes, sem persistir nenhum parâmetro nem gravar cálculo no histórico.

#### Scenario: Margem de porte digitada e ainda não salva
- **WHEN** um usuário digita 20% de margem B2C para a faixa G no formulário de faixas de porte, sem salvar
- **THEN** o simulador passa a projetar o preço da peça de exemplo usando 20% para o porte G, sem que nenhum registro seja criado no banco

#### Scenario: Formulário não tocado
- **WHEN** o usuário abre a tela de configuração e nenhum formulário foi editado
- **THEN** o simulador projeta o preço usando exclusivamente os parâmetros vigentes, e a coluna de preço projetado coincide com a de preço atual

#### Scenario: Simulação não polui o histórico de cálculos
- **WHEN** o usuário simula diversas peças de exemplo no simulador
- **THEN** nenhum registro é criado em histórico de cálculos de preço e nenhum parâmetro de precificação é alterado

### Requirement: Comparação entre preço vigente e preço projetado
O sistema SHALL exibir, lado a lado, o preço que a peça de exemplo tem com os parâmetros vigentes e o preço que ela passaria a ter caso os valores em edição fossem salvos.

#### Scenario: Efeito de uma nova margem antes de salvar
- **WHEN** o usuário altera a margem de um porte no formulário e observa o simulador
- **THEN** o simulador exibe, para cada canal e cada faixa de volume, o preço atual e o preço projetado, deixando visível a diferença antes de qualquer gravação

### Requirement: Peça de exemplo digitada ou vinda do catálogo
O sistema SHALL permitir que a peça de exemplo do simulador seja informada digitando peso, tempo de impressão e impressora, ou selecionando uma peça do catálogo que tenha ficha de fatiamento cadastrada, caso em que peso e tempo são derivados dessa ficha.

#### Scenario: Simulação de peça do catálogo
- **WHEN** o usuário seleciona no simulador uma peça do catálogo com ficha de fatiamento cadastrada
- **THEN** o simulador preenche peso e tempo a partir da ficha e projeta o preço dessa peça com os parâmetros em edição

### Requirement: Porte ambíguo não bloqueia a simulação
O sistema SHALL permitir que o usuário escolha manualmente o porte da peça de exemplo quando peso e tempo apontarem para faixas diferentes, sem bloquear a simulação, já que nada é persistido.

#### Scenario: Peça de exemplo com peso e tempo em faixas conflitantes
- **WHEN** o peso da peça de exemplo cai na faixa P e o tempo cai na faixa G
- **THEN** o simulador exibe as duas faixas candidatas e permite escolher qual usar, projetando o preço com a margem do porte escolhido

### Requirement: Simulador usa exatamente a fórmula do motor de cálculo
O sistema SHALL calcular a simulação com a mesma lógica de cálculo usada pelo motor de precificação, de forma que uma simulação sem valores em edição produza o mesmo resultado que um cálculo real da mesma peça com os parâmetros vigentes.

#### Scenario: Simulação sem alterações reproduz o cálculo real
- **WHEN** o usuário simula uma peça sem ter editado nenhum formulário e, em seguida, executa o cálculo real da mesma peça na tela de cálculo de preço
- **THEN** o custo, a margem efetiva e os preços por canal e por faixa de volume são idênticos nos dois lugares

### Requirement: Acesso ao simulador restrito a quem configura precificação
O sistema SHALL exibir o simulador na tela de configuração de precificação para usuários `owner`/`socio` ou com role `precificacao`/`producao`, mantendo a mesma regra de leitura já aplicada aos parâmetros de precificação.

#### Scenario: Usuário de Produção abre a tela de configuração
- **WHEN** um usuário com apenas a role `producao` abre a tela de configuração de precificação
- **THEN** o simulador aparece e é utilizável, mesmo com os formulários de escrita desabilitados
