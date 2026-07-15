## ADDED Requirements

### Requirement: Configuração de margem de lucro por faixa de porte
O sistema SHALL permitir, no formulário de faixas de porte, informar por faixa (P/M/G) a margem de lucro B2C com seu modo de aplicação e a margem de lucro B2B com seu modo de aplicação, além do peso e do tempo já existentes, criando um novo registro versionado por submissão.

#### Scenario: Financeiro configura a margem do porte G
- **WHEN** o Financeiro seleciona a faixa G, informa margem B2C de 20% no modo `somar` e margem B2B de 10% no modo `substituir`, e salva
- **THEN** o sistema cria um novo registro da faixa G com as margens informadas e a tela passa a exibi-las como vigentes, preservando o registro anterior no histórico

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

## MODIFIED Requirements

### Requirement: Histórico de alterações visível por parâmetro
Para cada categoria de parâmetro (custo, impressora, taxa de canal, faixa de porte), a tela SHALL exibir o histórico de valores anteriores com a data de vigência de cada um. No caso das faixas de porte, o histórico SHALL incluir as margens de lucro B2C e B2B e seus modos vigentes em cada versão.

#### Scenario: Consulta de histórico de energia
- **WHEN** um usuário abre o histórico do parâmetro de custo de energia
- **THEN** a tela lista todos os valores já registrados, ordenados do mais recente para o mais antigo, com a data de vigência de cada um

#### Scenario: Consulta de histórico de margem por porte
- **WHEN** um usuário abre o histórico das faixas de porte após uma alteração de margem
- **THEN** a tela lista as versões da faixa alterada, cada uma com sua data de vigência, suas margens B2C e B2B e os modos aplicados na época
