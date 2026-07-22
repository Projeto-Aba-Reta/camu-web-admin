## ADDED Requirements

### Requirement: Cadastro de parte inline de peça composta
O sistema SHALL permitir que uma peça do catálogo do tipo `composta` tenha uma ou mais **partes** inline — itens **não vendáveis separadamente**, que não são peças do catálogo — cada parte com nome, quantidade inteira maior que zero, gramas usadas na peça, gramas usadas em suporte, uma impressora ativa do parque e o tempo de impressão daquela parte na impressora escolhida.

#### Scenario: Cadastro das partes da Caixa Mandala
- **WHEN** um usuário autorizado cadastra a peça composta "Caixa Mandala" com as partes "Decágono central" (quantidade 1, 40g na peça, 2g em suporte, Ender-3 V3 SE, 3h), "Cunha" (quantidade 10, 8g na peça, 0g em suporte, Bambu Lab A1 Combo, 0,5h) e "Trava" (quantidade 10, 5g na peça, 0g em suporte, Bambu Lab A1 Combo, 0,4h)
- **THEN** o sistema persiste as três partes vinculadas à peça composta, cada uma com sua quantidade, gramas, impressora e tempo

#### Scenario: Tentativa de quantidade inválida em uma parte
- **WHEN** um usuário tenta cadastrar uma parte com quantidade zero ou negativa
- **THEN** o sistema rejeita a operação

#### Scenario: Parte não aparece como peça vendável do catálogo
- **WHEN** uma parte inline é cadastrada dentro de uma peça composta
- **THEN** a parte não é criada como peça do catálogo e não pode ser vendida nem referenciada isoladamente por outra composição

### Requirement: Parte com filamento vinculado ao estoque de insumos
O sistema SHALL permitir que cada parte referencie um insumo de filamento cadastrado no estoque de insumos, de onde o custo por kg do filamento daquela parte é derivado. A referência ao insumo SHALL ser opcional; quando ausente, o custo do filamento da parte usa o preço global de filamento por kg vigente.

#### Scenario: Parte com filamento de cor específica do estoque
- **WHEN** um usuário cadastra a parte "Decágono central" vinculando o insumo "Filamento PLA Branco" do estoque
- **THEN** o sistema persiste o vínculo e o custo de filamento dessa parte passa a ser derivado do custo de referência desse insumo

#### Scenario: Parte sem filamento vinculado usa o preço global
- **WHEN** um usuário cadastra uma parte sem vincular nenhum insumo de filamento
- **THEN** o sistema aceita a parte e o custo de filamento dela é calculado com o preço global de filamento por kg vigente

### Requirement: Edição e remoção de partes
O sistema SHALL permitir editar e remover partes de uma peça composta, sem afetar `price_calculations` já salvos que tenham usado essas partes.

#### Scenario: Remoção de uma parte
- **WHEN** um usuário remove a parte "Trava" de uma peça composta
- **THEN** o sistema exclui a parte e ela deixa de ser considerada em novos cálculos, mantendo inalterados os cálculos já salvos

#### Scenario: Edição de gramas de uma parte não recalcula cálculos salvos
- **WHEN** um usuário altera as gramas de uma parte já usada em um cálculo de preço salvo
- **THEN** o cálculo já salvo permanece inalterado e apenas novos cálculos passam a usar as gramas atualizadas

### Requirement: Leitura ampla por Produção, Financeiro e Marketing; escrita restrita a Produção
O sistema SHALL permitir leitura das partes de uma peça composta a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`, e permitir criar, editar ou remover partes apenas a usuários `owner`/`socio` ou com a role `producao` — mesma regra de acesso já usada no cadastro do catálogo.

#### Scenario: Usuário de Financeiro consulta as partes de uma peça
- **WHEN** um usuário com apenas a role `financeiro` consulta as partes de uma peça composta
- **THEN** o sistema exibe a lista de partes e seus dados normalmente

#### Scenario: Usuário de Marketing tenta editar uma parte
- **WHEN** um usuário com apenas a role `marketing` tenta adicionar ou remover uma parte
- **THEN** o sistema rejeita a escrita por Row Level Security
