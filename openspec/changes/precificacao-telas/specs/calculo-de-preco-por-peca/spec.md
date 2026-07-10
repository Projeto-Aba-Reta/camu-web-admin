## ADDED Requirements

### Requirement: Formulário de cálculo a partir de peso e tempo do fatiador
O sistema SHALL exibir um formulário com peso em gramas, tempo de impressão em horas e seleção de uma impressora ativa, submetendo esses valores ao motor de cálculo ao ser enviado.

#### Scenario: Envio do formulário de cálculo
- **WHEN** um usuário autorizado preenche peso, tempo e impressora e envia o formulário
- **THEN** o sistema executa o cálculo e exibe o resultado na mesma tela, sem navegação para outra página

### Requirement: Exibição do breakdown de custo
O sistema SHALL exibir, após um cálculo, os cinco componentes de custo (filamento, energia, depreciação, reserva de falha, embalagem) individualmente e o custo total.

#### Scenario: Resultado de um cálculo
- **WHEN** um cálculo é concluído com sucesso
- **THEN** a tela lista os cinco componentes de custo com seus valores e o total somado

### Requirement: Exibição do porte sugerido com tratamento de ambiguidade
O sistema SHALL exibir o porte sugerido (P, M ou G) retornado pelo motor de cálculo, e SHALL exibir um alerta não bloqueante com as faixas candidatas quando o motor sinalizar ambiguidade, permitindo ao usuário escolher manualmente o porte antes de salvar o cálculo.

#### Scenario: Porte sugerido sem ambiguidade
- **WHEN** o motor de cálculo retorna um único porte sugerido
- **THEN** a tela exibe um indicador visual do porte, sem exigir ação adicional do usuário

#### Scenario: Porte sugerido ambíguo
- **WHEN** o motor de cálculo sinaliza que peso e tempo indicam portes diferentes
- **THEN** a tela exibe as faixas candidatas e exige que o usuário selecione um porte antes de o cálculo ser salvo

### Requirement: Tabela de preço sugerido por canal
O sistema SHALL exibir, para cada canal com taxa vigente cadastrada, o preço sugerido e a margem líquida calculados pelo motor de cálculo.

#### Scenario: Resultado com múltiplos canais
- **WHEN** um cálculo é concluído e existem taxas vigentes para mais de um canal
- **THEN** a tela lista o preço sugerido e a margem de cada canal em uma linha própria

### Requirement: Histórico de cálculos executados
O sistema SHALL exibir uma listagem dos cálculos de preço já executados, filtrável por período e por porte sugerido, exibindo o snapshot salvo de cada cálculo sem recalcular com os parâmetros vigentes atuais.

#### Scenario: Consulta de um cálculo antigo após mudança de parâmetro
- **WHEN** um usuário consulta, no histórico, um cálculo executado antes de uma atualização de preço de filamento
- **THEN** a tela exibe o custo e o preço exatamente como calculados na época, não recalculados com o preço de filamento atual

### Requirement: Acesso de execução por Financeiro e Produção
O sistema SHALL permitir que usuários `owner`/`socio` ou com role `financeiro`/`producao` executem cálculos e consultem o histórico, sem exigir acesso à tela de configuração de parâmetros.

#### Scenario: Usuário de Produção executa um cálculo
- **WHEN** um usuário com apenas a role `producao` acessa a tela de cálculo de preço
- **THEN** o usuário consegue preencher o formulário, executar o cálculo e ver o histórico, sem acesso à tela de configuração
