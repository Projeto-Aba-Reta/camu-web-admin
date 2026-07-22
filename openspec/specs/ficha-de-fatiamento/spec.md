# ficha-de-fatiamento

## Purpose

Cadastro, por peça do catálogo e impressora ativa do parque, dos dados de fatiamento (materiais/gramas por linha e tempo de impressão) usados para calcular peso da peça e para alimentar a fila de impressão (impressoras elegíveis, materiais copiados ao iniciar e horário estimado de término).

## Requirements

### Requirement: Cadastro de ficha de fatiamento por peça e impressora
O sistema SHALL permitir cadastrar, para uma peça do catálogo e uma impressora ativa do parque, uma ficha de fatiamento contendo uma lista de um ou mais filamentos usados — cada linha referenciando o insumo de filamento do estoque (material/cor) usado, com gramas usadas na peça e gramas usadas em suporte — e o tempo de impressão gerado pela fatiadora para aquela combinação peça+impressora. O custo por kg de cada linha SHALL ser derivado do custo de referência do insumo referenciado, que por ter unidade `kg` ou `g` é sempre resolvível para um custo por kg.

#### Scenario: Cadastro de ficha com um único filamento
- **WHEN** um usuário autorizado cadastra uma ficha de fatiamento para uma peça e a impressora Ender-3 V3 SE, com uma linha de "Filamento PLA Branco" (30g na peça, 5g em suporte) e tempo de impressão de 3 horas
- **THEN** o sistema salva a ficha vinculada à peça e à impressora, com a linha de material e o tempo informados

#### Scenario: Cadastro de ficha com múltiplos filamentos (peça bicolor)
- **WHEN** um usuário autorizado cadastra uma ficha de fatiamento com duas linhas de material — "Filamento PLA Branco" (30g na peça, 5g em suporte) e "Filamento PLA Preto" (10g na peça, 0g em suporte) — para a mesma peça e impressora
- **THEN** o sistema salva as duas linhas vinculadas à mesma ficha

#### Scenario: Custo por kg derivado do insumo referenciado
- **WHEN** um usuário cadastra uma linha de material com o insumo "Filamento PLA Vermelho" do estoque, cujo custo de referência difere do preço global
- **THEN** o custo por kg dessa linha passa a ser derivado desse insumo, e não do preço global

#### Scenario: Custo por kg de filamento cadastrado em gramas
- **WHEN** a linha referencia um insumo de filamento cadastrado com unidade `g`
- **THEN** o sistema deriva o custo por kg dessa linha convertendo o custo por grama do insumo para custo por kg

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
O sistema SHALL permitir leitura da ficha de fatiamento a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`, e escrita (cadastrar, reeditar) apenas a usuários `owner`/`socio` ou com role `producao` — mesma regra de acesso já usada no cadastro do catálogo.

#### Scenario: Usuário de Marketing consulta a ficha de fatiamento
- **WHEN** um usuário com apenas a role `marketing` consulta a ficha de fatiamento de uma peça
- **THEN** o sistema exibe os dados normalmente

#### Scenario: Usuário de Marketing tenta cadastrar uma ficha de fatiamento
- **WHEN** um usuário com apenas a role `marketing` tenta cadastrar ou editar uma ficha de fatiamento
- **THEN** o sistema rejeita a escrita por Row Level Security

### Requirement: Peso e tempo disponíveis para o motor de cálculo de preço
O sistema SHALL disponibilizar, para o motor de cálculo de preço, o peso derivado (soma das gramas usadas na peça), o tempo de impressão e, por linha de material, o insumo de filamento vinculado (quando houver) de qualquer ficha de fatiamento cadastrada, para uma combinação peça+impressora selecionada em um cálculo de preço.

#### Scenario: Cálculo de preço consome a ficha de fatiamento
- **WHEN** o motor de cálculo de preço recebe uma peça e uma impressora que têm ficha de fatiamento cadastrada, sem peso ou tempo digitados manualmente
- **THEN** o sistema usa o peso derivado e o tempo de impressão dessa ficha como entrada do cálculo

#### Scenario: Custo de filamento por linha respeita o insumo vinculado
- **WHEN** uma ficha tem uma linha com insumo do estoque vinculado e outra linha sem vínculo
- **THEN** o motor calcula o custo de filamento da primeira linha pelo custo por kg do insumo vinculado e o da segunda pelo preço global vigente

#### Scenario: Ficha de fatiamento editada não altera cálculos já salvos
- **WHEN** uma ficha de fatiamento é reeditada depois de já ter sido usada em um cálculo de preço salvo
- **THEN** o cálculo de preço já salvo permanece inalterado, e apenas cálculos novos passam a usar os valores atualizados da ficha
