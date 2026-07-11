# gestao-de-estoque-de-insumos

## Purpose

Telas de gestão do estoque de insumos: listagem com saldo, custo de referência e indicação de estoque baixo; registro de movimentações (compra, consumo em produção, perda/refugo, ajuste manual) com vínculo sugerido à peça produzida; configuração de limite mínimo por insumo; e controle de acesso por role.

## Requirements

### Requirement: Listagem de insumos com saldo e alerta
O sistema SHALL exibir uma listagem de insumos com saldo atual, custo de referência e indicação visual de estoque baixo quando aplicável.

#### Scenario: Insumo abaixo do limite mínimo
- **WHEN** um insumo tem saldo abaixo do limite mínimo configurado
- **THEN** a listagem exibe esse insumo com indicação visual de estoque baixo

### Requirement: Registro de movimentação de insumo pela interface
O sistema SHALL permitir registrar, pela interface, uma movimentação de compra, consumo em produção, perda/refugo ou ajuste manual de um insumo.

#### Scenario: Registro de compra pela interface
- **WHEN** um usuário autorizado preenche o formulário de compra de insumo com a quantidade adquirida
- **THEN** o sistema registra a movimentação e o saldo exibido é atualizado

### Requirement: Vínculo sugerido entre consumo e produção de peça
Ao registrar consumo de insumo em produção, o sistema SHALL oferecer, como opção sugerida no mesmo formulário, registrar simultaneamente a peça pronta gerada por esse consumo.

#### Scenario: Consumo com peça produzida no mesmo lançamento
- **WHEN** um usuário preenche o consumo de insumo e informa a peça produzida no mesmo formulário
- **THEN** o sistema registra as duas movimentações (consumo de insumo e entrada de peça pronta) vinculadas

### Requirement: Configuração de limite mínimo pela interface
O sistema SHALL permitir configurar, pela interface, o limite mínimo de estoque de um insumo.

#### Scenario: Definição de limite mínimo
- **WHEN** um usuário autorizado define o limite mínimo de um insumo no detalhe do insumo
- **THEN** o sistema persiste o limite e passa a sinalizar estoque baixo conforme esse valor

### Requirement: Correção de lançamento apenas por ajuste manual
O sistema SHALL não oferecer edição ou exclusão de uma movimentação já registrada, disponibilizando apenas o registro de uma nova movimentação de ajuste manual com nota obrigatória.

#### Scenario: Tentativa de corrigir lançamento incorreto
- **WHEN** um usuário identifica uma movimentação registrada com quantidade incorreta
- **THEN** a interface não oferece opção de editar essa movimentação, apenas de registrar um ajuste manual com nota explicando a correção

### Requirement: Acesso conforme regra de domínio do estoque
O sistema SHALL restringir o registro de movimentações e a configuração de limite a usuários `owner`/`socio` ou com a role `producao`, permitindo leitura da listagem e do saldo a `producao` e `financeiro`.

#### Scenario: Usuário de Financeiro acessa a tela de insumos
- **WHEN** um usuário com apenas a role `financeiro` acessa a tela de estoque de insumos
- **THEN** o sistema exibe saldo e alertas em modo somente leitura, sem ações de movimentação disponíveis
