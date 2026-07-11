## ADDED Requirements

### Requirement: Lançamento mensal de faturamento acumulado
O sistema SHALL permitir registrar, uma vez por mês de referência, o faturamento acumulado daquele mês.

#### Scenario: Lançamento do faturamento de um mês
- **WHEN** um Sócio/Owner registra o faturamento do mês de referência ainda não lançado
- **THEN** o sistema persiste o registro vinculado a esse mês

### Requirement: Um único lançamento por mês de referência
O sistema SHALL impedir mais de um lançamento de faturamento para o mesmo mês de referência.

#### Scenario: Segundo lançamento para o mesmo mês
- **WHEN** um usuário tenta registrar um segundo lançamento para um mês de referência já lançado
- **THEN** o sistema rejeita a criação, permitindo apenas atualizar o lançamento existente

### Requirement: Teto anual do MEI como parâmetro configurável por ano
O sistema SHALL manter o valor do teto anual de faturamento do MEI como um parâmetro configurável associado a um ano-calendário, não como um valor fixo no código.

#### Scenario: Consulta do teto vigente em um ano
- **WHEN** o sistema calcula o percentual do teto atingido para o ano corrente
- **THEN** o sistema usa o valor de teto configurado para esse ano-calendário específico

### Requirement: Cálculo do percentual do teto atingido
O sistema SHALL calcular o percentual do teto anual do MEI já atingido somando os lançamentos de faturamento dos últimos 12 meses de referência e dividindo pelo teto configurado para o ano corrente.

#### Scenario: Cálculo com histórico completo de 12 meses
- **WHEN** existem lançamentos de faturamento para os últimos 12 meses de referência
- **THEN** o sistema retorna o percentual do teto atingido como a soma desses 12 valores dividida pelo teto configurado

### Requirement: Acesso restrito a Owner e Sócio
O sistema SHALL permitir leitura e escrita dos lançamentos de faturamento e do teto configurado apenas a usuários com `user_type` `owner` ou `socio`.

#### Scenario: Usuário member tenta consultar o faturamento acumulado
- **WHEN** um usuário com `user_type = 'member'` tenta consultar o acompanhamento de faturamento x teto
- **THEN** o sistema nega o acesso por não haver policy que autorize esse usuário
