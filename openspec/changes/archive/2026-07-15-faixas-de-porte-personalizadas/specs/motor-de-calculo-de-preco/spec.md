## MODIFIED Requirements

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
