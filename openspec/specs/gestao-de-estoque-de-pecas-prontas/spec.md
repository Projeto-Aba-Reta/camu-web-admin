# gestao-de-estoque-de-pecas-prontas

## Purpose

Telas de gestão do estoque de peças prontas do catálogo: listagem com saldo disponível derivado das movimentações, registro de movimentações (produção, venda, perda, ajuste manual) e controle de acesso por role.

## Requirements

### Requirement: Listagem de peças com saldo disponível
O sistema SHALL exibir uma listagem das peças do catálogo com a quantidade disponível em estoque, derivada das movimentações registradas.

#### Scenario: Consulta de saldo de uma peça
- **WHEN** um usuário acessa a listagem de estoque de peças prontas
- **THEN** a tela exibe, para cada peça, a quantidade disponível calculada a partir de suas movimentações

### Requirement: Registro de movimentação de peça pronta pela interface
O sistema SHALL permitir registrar, pela interface, uma movimentação de produção, venda, perda ou ajuste manual de uma peça do catálogo.

#### Scenario: Registro de produção pela interface
- **WHEN** um usuário autorizado registra a produção de 3 unidades de uma peça
- **THEN** o sistema registra a movimentação e a quantidade disponível exibida é atualizada

### Requirement: Correção de lançamento apenas por ajuste manual
O sistema SHALL não oferecer edição ou exclusão de uma movimentação de peça pronta já registrada, disponibilizando apenas o registro de uma nova movimentação de ajuste manual com nota obrigatória.

#### Scenario: Correção de quantidade produzida incorreta
- **WHEN** um usuário identifica que uma movimentação de produção foi registrada com quantidade incorreta
- **THEN** a interface não oferece edição dessa movimentação, apenas o registro de um ajuste manual com nota explicando a correção

### Requirement: Acesso conforme regra de domínio do estoque
O sistema SHALL restringir o registro de movimentações de peça pronta a usuários `owner`/`socio` ou com a role `producao`, permitindo leitura da listagem e do saldo a `producao` e `precificacao`.

#### Scenario: Usuário de Precificação acessa a tela de peças prontas
- **WHEN** um usuário com apenas a role `precificacao` acessa a tela de estoque de peças prontas
- **THEN** o sistema exibe o saldo em modo somente leitura, sem ações de movimentação disponíveis
