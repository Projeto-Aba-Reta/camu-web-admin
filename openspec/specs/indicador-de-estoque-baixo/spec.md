# indicador-de-estoque-baixo

## Purpose

Indicador visível fora da tela de estoque (topbar do dashboard) que sinaliza a contagem de insumos em estoque baixo e direciona para a listagem já filtrada, restrito a quem tem acesso ao domínio de Produção.

## Requirements

### Requirement: Indicador de estoque baixo visível fora da tela de estoque
O sistema SHALL exibir, na topbar do dashboard, um indicador com a contagem de insumos atualmente em estoque baixo, visível a usuários `owner`/`socio` ou com role `producao`.

#### Scenario: Existência de insumos em estoque baixo
- **WHEN** dois insumos estão com saldo abaixo do limite mínimo configurado
- **THEN** a topbar exibe um indicador com a contagem "2"

#### Scenario: Nenhum insumo em estoque baixo
- **WHEN** nenhum insumo está com saldo abaixo do limite mínimo configurado
- **THEN** o indicador não é exibido na topbar

### Requirement: Indicador direciona para a listagem filtrada
Ao acionar o indicador de estoque baixo, o sistema SHALL levar o usuário à tela de estoque de insumos já filtrada para exibir apenas os insumos em estoque baixo.

#### Scenario: Usuário aciona o indicador
- **WHEN** um usuário clica no indicador de estoque baixo na topbar
- **THEN** o sistema navega para a tela de estoque de insumos com o filtro de estoque baixo já aplicado

### Requirement: Indicador não visível a usuários sem acesso ao domínio de Produção
O sistema SHALL ocultar o indicador de estoque baixo para usuários sem `user_type` `owner`/`socio` e sem a role `producao`.

#### Scenario: Usuário de Marketing acessa o dashboard
- **WHEN** um usuário com apenas a role `marketing` acessa qualquer página do dashboard
- **THEN** o indicador de estoque baixo não aparece na topbar

