## MODIFIED Requirements

### Requirement: Parâmetros de custo versionados por vigência
O sistema SHALL armazenar os parâmetros globais de custo (preço do filamento por kg, custo de energia por kWh, consumo médio de impressão em watts, percentual de reserva para falha, custo de embalagem e percentual de margem-alvo B2C) como registros imutáveis com `valid_from`, nunca sobrescrevendo um registro existente ao alterar um valor.

#### Scenario: Owner altera o preço do filamento
- **WHEN** o Owner registra um novo preço de filamento por kg
- **THEN** o sistema cria um novo registro de parâmetros com `valid_from = now()`, preservando o registro anterior sem alteração

#### Scenario: Owner define a margem-alvo B2C
- **WHEN** o Owner registra um novo percentual de margem-alvo B2C
- **THEN** o sistema cria um novo registro de parâmetros com `valid_from = now()`, preservando o registro anterior, e o novo percentual passa a ser usado pelo motor de cálculo de preço a partir desse momento

#### Scenario: Margem-alvo ausente equivale a zero
- **WHEN** nenhum valor de margem-alvo B2C foi registrado ainda
- **THEN** o sistema considera a margem-alvo vigente como zero, preservando o comportamento de preço de equilíbrio existente antes desse parâmetro
