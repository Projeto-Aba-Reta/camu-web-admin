# configuracao-de-precificacao

## Purpose

Telas de configuração dos parâmetros que alimentam o motor de cálculo de preço: parâmetros de custo, parque de impressoras e taxas por canal, todas com histórico de alterações visível e escrita restrita conforme a regra de acesso do domínio.

## Requirements

### Requirement: Tela de configuração de parâmetros de custo
O sistema SHALL exibir uma tela onde usuários autorizados visualizam os parâmetros de custo vigentes (filamento, energia, consumo, reserva de falha, embalagem) e submetem novos valores, cada submissão criando um novo registro versionado sem alterar o anterior.

#### Scenario: Owner atualiza o preço do filamento pela tela
- **WHEN** o Owner preenche um novo valor de preço de filamento e salva
- **THEN** o sistema cria um novo registro de parâmetros de custo e a tela passa a exibir esse novo valor como vigente

### Requirement: Tela de configuração do parque de impressoras
O sistema SHALL exibir uma tela para cadastrar impressoras e revisar/atualizar a depreciação por hora de cada uma, ativando/desativando máquinas do parque.

#### Scenario: Cadastro de nova impressora pela tela
- **WHEN** um usuário autorizado preenche nome, modelo e depreciação por hora de uma nova impressora
- **THEN** o sistema cria o registro e a impressora passa a aparecer como opção na tela de cálculo de preço

### Requirement: Tela de configuração de taxas por canal
O sistema SHALL exibir uma tela para revisar e atualizar a taxa percentual e fixa de cada canal de venda suportado, criando um novo registro versionado por atualização.

#### Scenario: Atualização de taxa de um canal
- **WHEN** um usuário autorizado atualiza a taxa percentual da Shopee
- **THEN** o sistema cria um novo registro de taxa para o canal Shopee, preservando o histórico

### Requirement: Histórico de alterações visível por parâmetro
Para cada categoria de parâmetro (custo, impressora, taxa de canal, faixa de porte), a tela SHALL exibir o histórico de valores anteriores com a data de vigência de cada um.

#### Scenario: Consulta de histórico de energia
- **WHEN** um usuário abre o histórico do parâmetro de custo de energia
- **THEN** a tela lista todos os valores já registrados, ordenados do mais recente para o mais antigo, com a data de vigência de cada um

### Requirement: Escrita restrita por regra de acesso do domínio
A tela SHALL permitir submissão de novos parâmetros de custo e taxas de canal apenas a usuários `owner`/`socio` ou com a role `financeiro`, e submissão de cadastro/atualização de impressoras a `owner`/`socio` ou role `producao`, refletindo na interface (desabilitando os formulários) quando o usuário autenticado não tiver a permissão correspondente.

#### Scenario: Usuário de Produção acessa a tela de configuração
- **WHEN** um usuário com apenas a role `producao` abre a tela de configuração de precificação
- **THEN** o formulário de parâmetros de custo e de taxas de canal aparece desabilitado, mas o formulário de parque de impressoras permanece editável
