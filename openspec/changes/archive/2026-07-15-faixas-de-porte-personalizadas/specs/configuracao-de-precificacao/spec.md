## ADDED Requirements

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

## MODIFIED Requirements

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
