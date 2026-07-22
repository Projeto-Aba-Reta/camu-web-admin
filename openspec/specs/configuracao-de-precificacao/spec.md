# configuracao-de-precificacao

## Purpose

Telas de configuração dos parâmetros que alimentam o motor de cálculo de preço: parâmetros de custo, parque de impressoras e taxas por canal, todas com histórico de alterações visível e escrita restrita conforme a regra de acesso do domínio.

## Requirements

### Requirement: Tela de configuração de parâmetros de custo
O sistema SHALL exibir uma tela onde usuários autorizados visualizam os parâmetros de custo vigentes (filamento, energia, consumo, reserva de falha, embalagem e margem-alvo B2C) e submetem novos valores, cada submissão criando um novo registro versionado sem alterar o anterior.

#### Scenario: Owner atualiza o preço do filamento pela tela
- **WHEN** o Owner preenche um novo valor de preço de filamento e salva
- **THEN** o sistema cria um novo registro de parâmetros de custo e a tela passa a exibir esse novo valor como vigente

#### Scenario: Owner atualiza a margem-alvo B2C pela tela
- **WHEN** o Owner preenche um novo percentual de margem-alvo B2C e salva
- **THEN** o sistema cria um novo registro de parâmetros de custo com o novo percentual e a tela passa a exibi-lo como vigente

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
Para cada categoria de parâmetro (custo, impressora, taxa de canal, faixa de porte), a tela SHALL exibir o histórico de valores anteriores com a data de vigência de cada um. No caso das faixas de porte, o histórico SHALL incluir as margens de lucro B2C e B2B e seus modos vigentes em cada versão.

#### Scenario: Consulta de histórico de energia
- **WHEN** um usuário abre o histórico do parâmetro de custo de energia
- **THEN** a tela lista todos os valores já registrados, ordenados do mais recente para o mais antigo, com a data de vigência de cada um

#### Scenario: Consulta de histórico de margem por porte
- **WHEN** um usuário abre o histórico das faixas de porte após uma alteração de margem
- **THEN** a tela lista as versões da faixa alterada, cada uma com sua data de vigência, suas margens B2C e B2B e os modos aplicados na época

### Requirement: Cadastro de portes personalizados na tela de configuração
O sistema SHALL permitir, na tela de configuração de precificação, cadastrar um porte personalizado informando código, nome de exibição e ordem, além de editar o nome e a ordem de qualquer porte e remover portes personalizados sem referências. A tela SHALL exibir, junto de cada faixa de porte, o código e o nome de exibição do porte.

#### Scenario: Cadastro de um porte GG pela tela
- **WHEN** o Financeiro informa código `GG`, nome "Extra Grande" e ordem posterior à de G, e salva
- **THEN** o sistema registra o porte e ele passa a aparecer como opção ao cadastrar faixa de peso/tempo e margens, e no seletor de porte das telas de cálculo

#### Scenario: Porte de sistema não oferece remoção
- **WHEN** o Financeiro visualiza os portes P, M e G na tela de configuração
- **THEN** a tela permite editar nome, ordem, faixa e margens desses portes, mas não oferece a ação de removê-los nem de alterar o código

#### Scenario: Faixa de porte exibe código e nome
- **WHEN** o Financeiro consulta as faixas de porte vigentes
- **THEN** cada faixa exibe o código e o nome de exibição do porte, além do peso, do tempo e das margens

### Requirement: Configuração de margem de lucro por faixa de porte
O sistema SHALL permitir, no formulário de faixas de porte, informar por porte (fixo ou personalizado) a margem de lucro B2C com seu modo de aplicação e a margem de lucro B2B com seu modo de aplicação, além do peso e do tempo já existentes, criando um novo registro versionado por submissão.

#### Scenario: Financeiro configura a margem do porte G
- **WHEN** o Financeiro seleciona a faixa G, informa margem B2C de 20% no modo `somar` e margem B2B de 10% no modo `substituir`, e salva
- **THEN** o sistema cria um novo registro da faixa G com as margens informadas e a tela passa a exibi-las como vigentes, preservando o registro anterior no histórico

#### Scenario: Financeiro configura a margem de um porte personalizado
- **WHEN** o Financeiro seleciona um porte personalizado `GG` e informa suas margens B2C e B2B com seus modos
- **THEN** o sistema cria o registro de faixa do porte `GG` com as margens informadas, usadas nos cálculos seguintes de peças desse porte

#### Scenario: Modo de aplicação explicado na interface
- **WHEN** o usuário abre o seletor de modo de uma margem por porte
- **THEN** a interface deixa explícito que `somar` adiciona a margem à margem-alvo global e que `substituir` faz a margem do porte valer sozinha, ignorando a margem-alvo

#### Scenario: Tabela de faixas vigentes exibe as margens
- **WHEN** o usuário consulta a tabela de faixas de porte vigentes
- **THEN** cada linha exibe, além do peso e do tempo, a margem B2C e a margem B2B da faixa com seus respectivos modos

### Requirement: Painel de simulação de precificação na tela de configuração
O sistema SHALL exibir, na tela de configuração de precificação, um painel de simulação que projeta o preço de uma peça de exemplo aplicando os parâmetros vigentes e os valores que estão sendo editados nos formulários da tela, exibindo a fórmula expandida e comparando o preço atual com o preço projetado, sem persistir nada.

#### Scenario: Simulação antes de salvar uma nova margem
- **WHEN** o Financeiro digita uma nova margem para a faixa M no formulário de faixas de porte e informa uma peça de exemplo no simulador, sem salvar
- **THEN** o painel exibe a fórmula com os valores substituídos e mostra, lado a lado, o preço atual da peça e o preço que ela teria caso a margem digitada fosse salva

#### Scenario: Simulação disponível sem permissão de escrita
- **WHEN** um usuário com apenas a role `producao` abre a tela de configuração de precificação
- **THEN** o painel de simulação continua utilizável, mesmo com os formulários de parâmetros financeiros desabilitados

### Requirement: Escrita restrita por regra de acesso do domínio
A tela SHALL permitir submissão de novos parâmetros de custo, taxas de canal e faixas de precificação B2B apenas a usuários `owner`/`socio` ou com a role `financeiro`, e submissão de cadastro/atualização de impressoras a `owner`/`socio` ou role `producao`, refletindo na interface (desabilitando os formulários) quando o usuário autenticado não tiver a permissão correspondente.

#### Scenario: Usuário de Produção acessa a tela de configuração
- **WHEN** um usuário com apenas a role `producao` abre a tela de configuração de precificação
- **THEN** o formulário de parâmetros de custo, de taxas de canal e de faixas B2B aparece desabilitado, mas o formulário de parque de impressoras permanece editável

### Requirement: Tela de configuração de faixas de desconto por volume B2B
O sistema SHALL exibir uma tela para cadastrar e atualizar as faixas de precificação B2B (quantidade mínima e margem-alvo por faixa), criando um novo registro versionado por atualização.

#### Scenario: Cadastro de faixa B2B pela tela
- **WHEN** um usuário autorizado preenche quantidade mínima e margem-alvo de uma nova faixa B2B e salva
- **THEN** o sistema cria o registro de faixa e ela passa a ser usada nos cálculos de preço B2B seguintes
