## MODIFIED Requirements

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

### Requirement: Breakdown de custo por componente para peça composta
O sistema SHALL exibir, ao calcular o preço de uma peça composta, o custo de cada componente e sua quantidade, além do custo total agregado. A tela SHALL exigir que o usuário escolha o porte da peça composta antes de disparar o cálculo, já que uma peça composta não tem porte classificado automaticamente e o porte determina a margem aplicada.

#### Scenario: Resultado do cálculo da Caixa Mandala
- **WHEN** um cálculo é concluído para a peça composta "Caixa Mandala", com o porte G escolhido pelo usuário
- **THEN** a tela lista o custo e a quantidade de cada componente (decágono, cunha, trava), o custo total do conjunto e os preços projetados com a margem efetiva da faixa G

#### Scenario: Cálculo de peça composta sem porte escolhido
- **WHEN** o usuário tenta calcular o preço de uma peça composta sem ter escolhido o porte
- **THEN** a tela impede o disparo do cálculo e indica que a escolha do porte é necessária

## ADDED Requirements

### Requirement: Exibição da margem efetiva aplicada e sua origem
O sistema SHALL exibir, no resultado de um cálculo, a margem efetiva aplicada ao preço B2C e a cada faixa de volume B2B, junto com sua composição — margem-alvo base, margem da faixa de porte e modo (`somar` ou `substituir`) —, de forma que o usuário entenda por que aquele preço foi projetado.

#### Scenario: Margem efetiva de uma peça M
- **WHEN** um cálculo é concluído para uma peça classificada como M, com margem-alvo B2C de 15% e margem B2C de 10% no modo `somar` na faixa M
- **THEN** a tela exibe a margem efetiva de 25% indicando que ela vem da soma da margem-alvo com a margem do porte M

#### Scenario: Cálculo antigo sem margem registrada
- **WHEN** o usuário consulta no histórico um cálculo salvo antes da existência da margem por porte
- **THEN** a tela exibe o snapshot original com custo e preços, sem exibir composição de margem, e sem recalcular o registro
