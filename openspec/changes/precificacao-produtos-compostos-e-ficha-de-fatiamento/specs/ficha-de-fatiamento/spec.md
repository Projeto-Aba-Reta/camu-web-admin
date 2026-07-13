## ADDED Requirements

### Requirement: Peso e tempo disponíveis para o motor de cálculo de preço
O sistema SHALL disponibilizar, para o motor de cálculo de preço, o peso derivado (soma das gramas usadas na peça) e o tempo de impressão de qualquer ficha de fatiamento cadastrada, para uma combinação peça+impressora selecionada em um cálculo de preço.

#### Scenario: Cálculo de preço consome a ficha de fatiamento
- **WHEN** o motor de cálculo de preço recebe uma peça e uma impressora que têm ficha de fatiamento cadastrada, sem peso ou tempo digitados manualmente
- **THEN** o sistema usa o peso derivado e o tempo de impressão dessa ficha como entrada do cálculo

#### Scenario: Ficha de fatiamento editada não altera cálculos já salvos
- **WHEN** uma ficha de fatiamento é reeditada depois de já ter sido usada em um cálculo de preço salvo
- **THEN** o cálculo de preço já salvo permanece inalterado, e apenas cálculos novos passam a usar os valores atualizados da ficha
