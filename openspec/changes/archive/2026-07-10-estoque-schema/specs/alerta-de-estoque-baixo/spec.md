## ADDED Requirements

### Requirement: Limite mínimo configurável por insumo
O sistema SHALL permitir configurar, para cada insumo, uma quantidade mínima abaixo da qual o estoque é considerado baixo.

#### Scenario: Configuração de limite mínimo
- **WHEN** um usuário autorizado define o limite mínimo de um insumo como 500g
- **THEN** o sistema persiste esse limite associado ao insumo

### Requirement: Sinalização de estoque abaixo do limite
O sistema SHALL sinalizar um insumo como em estoque baixo sempre que seu saldo derivado das movimentações estiver abaixo do limite mínimo configurado.

#### Scenario: Saldo cai abaixo do limite após consumo
- **WHEN** o saldo de um insumo cai para 400g e o limite mínimo configurado é 500g
- **THEN** o sistema sinaliza esse insumo como em estoque baixo

### Requirement: Insumo sem limite configurado nunca é sinalizado
O sistema SHALL considerar que um insumo sem limite mínimo configurado nunca está em estoque baixo, independentemente do saldo atual.

#### Scenario: Insumo novo sem limite configurado
- **WHEN** um insumo recém-cadastrado ainda não tem limite mínimo configurado
- **THEN** o sistema não o sinaliza como em estoque baixo, mesmo com saldo próximo de zero

### Requirement: Configuração restrita a Produção
O sistema SHALL permitir configurar o limite mínimo apenas a usuários `owner`/`socio` ou com a role `producao`, com a sinalização de estoque baixo visível a `producao`/`financeiro`.

#### Scenario: Usuário de Financeiro visualiza alerta
- **WHEN** um usuário com apenas a role `financeiro` consulta os insumos
- **THEN** o sistema exibe quais insumos estão em estoque baixo, sem permitir alterar o limite configurado
