# calculo-de-preco-por-peca

## Purpose

Tela de cálculo de preço por peça a partir de peso e tempo do fatiador, exibindo breakdown de custo, porte sugerido (com tratamento de ambiguidade), preço sugerido e margem por canal, além do histórico de cálculos já executados.

## Requirements

### Requirement: Formulário de cálculo a partir de peso e tempo do fatiador
O sistema SHALL exibir um formulário com seleção de uma impressora ativa e, quando a peça e a impressora selecionadas tiverem uma ficha de fatiamento cadastrada, a opção de usar o peso e o tempo dessa ficha em vez de digitá-los manualmente; quando não houver ficha cadastrada, o formulário exige peso em gramas e tempo de impressão em horas digitados.

#### Scenario: Envio do formulário com ficha de fatiamento disponível
- **WHEN** um usuário autorizado seleciona uma peça e impressora que já têm ficha de fatiamento cadastrada e envia o formulário sem digitar peso ou tempo
- **THEN** o sistema executa o cálculo usando o peso e o tempo da ficha de fatiamento e exibe o resultado na mesma tela

#### Scenario: Envio do formulário sem ficha de fatiamento cadastrada
- **WHEN** um usuário autorizado seleciona uma peça e impressora sem ficha de fatiamento cadastrada, preenche peso e tempo manualmente e envia o formulário
- **THEN** o sistema executa o cálculo com os valores digitados e exibe o resultado na mesma tela

### Requirement: Exibição do breakdown de custo
O sistema SHALL exibir, após um cálculo, os cinco componentes de custo (filamento, energia, depreciação, reserva de falha, embalagem) individualmente e o custo total.

#### Scenario: Resultado de um cálculo
- **WHEN** um cálculo é concluído com sucesso
- **THEN** a tela lista os cinco componentes de custo com seus valores e o total somado

### Requirement: Exibição do porte sugerido com tratamento de ambiguidade
O sistema SHALL exibir o porte sugerido (P, M ou G) retornado pelo motor de cálculo, e SHALL exibir um alerta com as faixas candidatas quando o motor sinalizar ambiguidade, exigindo que o usuário escolha manualmente o porte antes de o cálculo ser salvo — já que o porte determina a margem de lucro aplicada, e não apenas o rótulo da peça.

#### Scenario: Porte sugerido sem ambiguidade
- **WHEN** o motor de cálculo retorna um único porte sugerido
- **THEN** a tela exibe um indicador visual do porte, sem exigir ação adicional do usuário

#### Scenario: Porte sugerido ambíguo
- **WHEN** o motor de cálculo sinaliza que peso e tempo indicam portes diferentes
- **THEN** a tela exibe as faixas candidatas e exige que o usuário selecione um porte antes de o cálculo ser salvo

#### Scenario: Escolha do porte atualiza os preços exibidos
- **WHEN** o usuário resolve uma ambiguidade escolhendo o porte G, cuja faixa tem margem diferente da faixa P
- **THEN** a tela passa a exibir os preços recalculados com a margem efetiva do porte G, antes de salvar

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

### Requirement: Exibição do preço B2B por faixa de volume
O sistema SHALL exibir, ao lado da tabela de preço sugerido por canal, uma tabela com o preço B2B calculado para cada faixa de quantidade vigente.

#### Scenario: Resultado com preços B2B por faixa
- **WHEN** um cálculo é concluído e existem faixas B2B vigentes cadastradas
- **THEN** a tela lista o preço B2B de cada faixa de quantidade em uma linha própria, ao lado da tabela de preços por canal

### Requirement: Breakdown de custo por componente para peça composta
O sistema SHALL exibir, ao calcular o preço de uma peça composta, o breakdown de cada fonte de custo do conjunto: para cada parte inline, o seu custo (filamento, energia e depreciação) e a sua quantidade; e para cada componente referenciado do catálogo, o custo e a quantidade. A tela SHALL exibir também a reserva de falha e a embalagem aplicadas ao conjunto e o custo total agregado. A tela SHALL exigir que o usuário escolha o porte da peça composta antes de disparar o cálculo, já que uma peça composta não tem porte classificado automaticamente e o porte determina a margem aplicada.

#### Scenario: Resultado do cálculo da Caixa Mandala com partes inline
- **WHEN** um cálculo é concluído para a peça composta "Caixa Mandala" formada por partes inline (decágono, cunhas, travas), com o porte G escolhido pelo usuário
- **THEN** a tela lista, para cada parte, seu custo (filamento, energia, depreciação) e quantidade, a reserva de falha e a embalagem do conjunto, o custo total agregado e os preços projetados com a margem efetiva da faixa G

#### Scenario: Origem do preço de filamento exibida por parte
- **WHEN** uma parte tem um insumo de filamento do estoque vinculado e outra não tem
- **THEN** a tela indica, por parte, se o custo de filamento veio do insumo vinculado ou do preço global

#### Scenario: Cálculo de peça composta sem porte escolhido
- **WHEN** o usuário tenta calcular o preço de uma peça composta sem ter escolhido o porte
- **THEN** a tela impede o disparo do cálculo e indica que a escolha do porte é necessária

### Requirement: Exibição da margem efetiva aplicada e sua origem
O sistema SHALL exibir, no resultado de um cálculo, a margem efetiva aplicada ao preço B2C e a cada faixa de volume B2B, junto com sua composição — margem-alvo base, margem da faixa de porte e modo (`somar` ou `substituir`) —, de forma que o usuário entenda por que aquele preço foi projetado.

#### Scenario: Margem efetiva de uma peça M
- **WHEN** um cálculo é concluído para uma peça classificada como M, com margem-alvo B2C de 15% e margem B2C de 10% no modo `somar` na faixa M
- **THEN** a tela exibe a margem efetiva de 25% indicando que ela vem da soma da margem-alvo com a margem do porte M

#### Scenario: Cálculo antigo sem margem registrada
- **WHEN** o usuário consulta no histórico um cálculo salvo antes da existência da margem por porte
- **THEN** a tela exibe o snapshot original com custo e preços, sem exibir composição de margem, e sem recalcular o registro
