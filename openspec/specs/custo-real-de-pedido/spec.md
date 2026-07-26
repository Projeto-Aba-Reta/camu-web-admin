# custo-real-de-pedido

## Purpose

Lançamentos do custo efetivamente incorrido em cada pedido de venda — filamento, embalagem, frete, taxa de canal e outros — somados no custo real do pedido e usados para derivar o lucro operacional (venda menos custo real). Cobre as categorias aceitas, a validação dos valores, a edição e exclusão de lançamentos e o acesso ampliado à Produção, que é quem conhece o consumo real.

## Requirements

### Requirement: Lançamento de custo real do pedido
O sistema SHALL permitir registrar, em um pedido, um ou mais lançamentos de custo efetivamente incorrido, cada um com valor em centavos, categoria e descrição opcional. O custo real do pedido SHALL ser a soma dos seus lançamentos.

#### Scenario: Primeiro lançamento de custo
- **WHEN** um usuário autorizado lança R$ 14,50 de custo com categoria "filamento" em um pedido sem custos registrados
- **THEN** o custo real do pedido passa a ser R$ 14,50

#### Scenario: Múltiplos lançamentos somam
- **WHEN** o mesmo pedido recebe também R$ 3,20 de "embalagem" e R$ 21,90 de "frete"
- **THEN** o custo real do pedido passa a ser R$ 39,60

#### Scenario: Pedido sem custo lançado
- **WHEN** um pedido não tem nenhum lançamento de custo
- **THEN** o sistema trata seu custo real como zero e o sinaliza na listagem como "custo não informado"

### Requirement: Lançamento derivado da precificação dos itens
O sistema SHALL distinguir o lançamento derivado do custo estimado dos itens do pedido dos lançamentos feitos à mão pelo time, marcando sua origem. O lançamento derivado SHALL ser mantido pelo próprio pedido — reescrito a cada gravação e removido quando o custo estimado deixa de existir — e o sistema SHALL recusar sua edição e exclusão pela tela de custo real, orientando o ajuste no item do pedido.

#### Scenario: Tentativa de editar o lançamento derivado
- **WHEN** um usuário tenta alterar o valor do lançamento marcado como vindo da precificação
- **THEN** o sistema rejeita a operação, orientando ajustar o custo no item do pedido

#### Scenario: Lançamento derivado somado ao manual
- **WHEN** um pedido tem R$ 18,00 vindos da precificação dos itens e R$ 21,90 lançados à mão como frete
- **THEN** o custo real do pedido é R$ 39,90

### Requirement: Categorias de custo
O sistema SHALL aceitar como categoria de custo apenas `filamento`, `embalagem`, `frete`, `taxa_canal` e `outros`, rejeitando qualquer outro valor.

#### Scenario: Categoria fora da lista
- **WHEN** um usuário tenta lançar um custo com categoria "energia"
- **THEN** o sistema rejeita a operação, orientando o uso da categoria "outros"

#### Scenario: Custo em "outros" com descrição
- **WHEN** um usuário lança R$ 5,00 na categoria "outros" com a descrição "cola quente"
- **THEN** o sistema persiste o lançamento com a descrição informada

### Requirement: Valores de custo não negativos
O sistema SHALL exigir que cada lançamento de custo tenha valor maior que zero, em centavos.

#### Scenario: Valor zero
- **WHEN** um usuário tenta lançar um custo de R$ 0,00
- **THEN** o sistema rejeita a operação

#### Scenario: Valor negativo
- **WHEN** um usuário tenta lançar um custo negativo para "estornar" um lançamento anterior
- **THEN** o sistema rejeita a operação, orientando a excluir ou editar o lançamento original

### Requirement: Edição e exclusão de lançamento de custo
O sistema SHALL permitir editar e excluir um lançamento de custo individualmente, recalculando o custo real e o lucro do pedido em seguida.

#### Scenario: Correção de valor lançado
- **WHEN** um usuário corrige um lançamento de R$ 14,50 para R$ 12,00
- **THEN** o custo real e o lucro do pedido são recalculados com o novo valor

#### Scenario: Exclusão de lançamento
- **WHEN** um usuário exclui um lançamento de custo
- **THEN** o valor deixa de compor o custo real do pedido

### Requirement: Lucro do pedido derivado de venda menos custo real
O sistema SHALL calcular o lucro de um pedido como o total de venda menos o custo real, exibindo-o no pedido, na listagem e no funil. O lucro SHALL ser tratado como operacional — não desconta imposto, pró-labore nem rateio de custo fixo.

#### Scenario: Pedido lucrativo
- **WHEN** um pedido tem total de venda R$ 92,00 e custo real R$ 39,60
- **THEN** o sistema exibe lucro de R$ 52,40

#### Scenario: Pedido com prejuízo
- **WHEN** o custo real de um pedido supera o total de venda
- **THEN** o sistema exibe o lucro como valor negativo, destacado como prejuízo

#### Scenario: Lucro de pedido sem custo informado
- **WHEN** um pedido tem venda registrada e nenhum lançamento de custo
- **THEN** o sistema exibe lucro igual ao total de venda, acompanhado do aviso de que o custo ainda não foi informado

### Requirement: Acesso ao custo real de pedido
O sistema SHALL permitir leitura dos custos e do lucro por pedido, bem como escrita (lançar, editar, excluir custo), a `owner`/`socio` ou às roles `vendas`, `precificacao` e `producao` — quem pode lançar custo precisa enxergar o que lançou. A agregação do período permanece restrita conforme `resultado-de-vendas`.

#### Scenario: Produção lança custo de filamento
- **WHEN** um usuário com a role `producao` lança o custo de filamento gasto em um pedido
- **THEN** o sistema aceita o lançamento, pois quem imprime é quem sabe o consumo real

#### Scenario: Produção revisa o que lançou
- **WHEN** um usuário com a role `producao` abre um pedido em que lançou custo
- **THEN** o sistema exibe os lançamentos e o lucro daquele pedido, permitindo-lhe corrigir o valor

#### Scenario: Marketing tenta ver o lucro
- **WHEN** um usuário com apenas a role `marketing` tenta acessar o custo e o lucro de um pedido
- **THEN** o sistema nega o acesso
