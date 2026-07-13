# ficha-de-fatiamento

## Purpose

Cadastro, por peça do catálogo e impressora ativa do parque, dos dados de fatiamento (materiais/gramas por linha e tempo de impressão) usados para calcular peso da peça e para alimentar a fila de impressão (impressoras elegíveis, materiais copiados ao iniciar e horário estimado de término).

## Requirements

### Requirement: Cadastro de ficha de fatiamento por peça e impressora
O sistema SHALL permitir cadastrar, para uma peça do catálogo e uma impressora ativa do parque, uma ficha de fatiamento contendo uma lista de um ou mais filamentos usados — cada linha com material (cor), gramas usadas na peça e gramas usadas em suporte — e o tempo de impressão gerado pela fatiadora para aquela combinação peça+impressora.

#### Scenario: Cadastro de ficha com um único filamento
- **WHEN** um usuário autorizado cadastra uma ficha de fatiamento para uma peça e a impressora Ender-3 V3 SE, com uma linha de "Filamento PLA Branco" (30g na peça, 5g em suporte) e tempo de impressão de 3 horas
- **THEN** o sistema salva a ficha vinculada à peça e à impressora, com a linha de material e o tempo informados

#### Scenario: Cadastro de ficha com múltiplos filamentos (peça bicolor)
- **WHEN** um usuário autorizado cadastra uma ficha de fatiamento com duas linhas de material — "Filamento PLA Branco" (30g na peça, 5g em suporte) e "Filamento PLA Preto" (10g na peça, 0g em suporte) — para a mesma peça e impressora
- **THEN** o sistema salva as duas linhas vinculadas à mesma ficha

### Requirement: Uma ficha por combinação peça+impressora
O sistema SHALL permitir no máximo uma ficha de fatiamento por combinação peça+impressora; cadastrar uma nova ficha para uma combinação já existente SHALL substituir integralmente os dados anteriores (materiais e tempo).

#### Scenario: Reeditar ficha existente
- **WHEN** um usuário cadastra uma nova ficha de fatiamento para uma peça e impressora que já tinham uma ficha cadastrada
- **THEN** o sistema substitui as linhas de material e o tempo de impressão anteriores pelos novos valores, mantendo o vínculo com a mesma peça e impressora

#### Scenario: Cadastrar ficha para uma segunda impressora da mesma peça
- **WHEN** uma peça já tem uma ficha de fatiamento cadastrada para a impressora Ender-3 V3 SE e um usuário cadastra uma nova ficha para a mesma peça na impressora Bambu Lab A1 Combo
- **THEN** o sistema cria uma segunda ficha, independente da primeira, sem alterar os dados já cadastrados para a Ender-3 V3 SE

### Requirement: Peso da peça derivado da ficha
O sistema SHALL calcular o peso da peça, para uma ficha de fatiamento, como a soma das gramas usadas na peça (excluindo suporte) de todas as suas linhas de material.

#### Scenario: Peso calculado a partir de múltiplas cores
- **WHEN** uma ficha de fatiamento tem uma linha de 30g na peça de "Filamento PLA Branco" e outra de 10g na peça de "Filamento PLA Preto"
- **THEN** o sistema exibe o peso da peça como 40g, sem incluir as gramas de suporte de nenhuma das linhas

### Requirement: Acesso à ficha de fatiamento
O sistema SHALL permitir leitura da ficha de fatiamento a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketplace-vendas`, e escrita (cadastrar, reeditar) apenas a usuários `owner`/`socio` ou com role `producao` — mesma regra de acesso já usada no cadastro do catálogo.

#### Scenario: Usuário de Vendas consulta a ficha de fatiamento
- **WHEN** um usuário com apenas a role `marketplace-vendas` consulta a ficha de fatiamento de uma peça
- **THEN** o sistema exibe os dados normalmente

#### Scenario: Usuário de Vendas tenta cadastrar uma ficha de fatiamento
- **WHEN** um usuário com apenas a role `marketplace-vendas` tenta cadastrar ou editar uma ficha de fatiamento
- **THEN** o sistema rejeita a escrita por Row Level Security
