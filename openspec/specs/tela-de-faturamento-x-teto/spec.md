# Spec: Tela de Faturamento x Teto

## Purpose

Define o comportamento da tela de faturamento x teto, que exibe o indicador do percentual do teto anual do MEI atingido nos últimos 12 meses, a tabela de lançamentos mensais e o registro de novos lançamentos.

## Requirements

### Requirement: Indicador de percentual do teto atingido
A tela SHALL exibir um indicador visual do percentual do teto anual do MEI já atingido, calculado a partir dos últimos 12 meses de referência lançados.

#### Scenario: Consulta do indicador
- **WHEN** um Sócio/Owner acessa a tela de faturamento x teto
- **THEN** a tela exibe o percentual do teto atingido nos últimos 12 meses

### Requirement: Destaque visual acima de 80% do teto
Quando o percentual do teto atingido ultrapassar 80%, a tela SHALL exibir um destaque visual de atenção junto ao indicador.

#### Scenario: Percentual acima de 80%
- **WHEN** o percentual do teto atingido calculado é 85%
- **THEN** a tela exibe o indicador com destaque visual de atenção

### Requirement: Tabela de lançamentos mensais com destaque de mês faltante
A tela SHALL exibir uma tabela dos lançamentos mensais de faturamento dentro da janela dos últimos 12 meses, destacando visualmente qualquer mês de referência sem lançamento.

#### Scenario: Mês sem lançamento na janela de 12 meses
- **WHEN** um dos últimos 12 meses de referência não tem lançamento de faturamento registrado
- **THEN** a tabela destaca esse mês como pendente de lançamento

### Requirement: Registro de lançamento mensal pela interface
A tela SHALL permitir registrar o faturamento de um mês de referência ainda não lançado, e SHALL impedir um segundo lançamento para um mês já lançado.

#### Scenario: Tentativa de lançar um mês já registrado
- **WHEN** um usuário tenta registrar o faturamento de um mês de referência que já tem lançamento
- **THEN** a tela oferece apenas a opção de atualizar o lançamento existente, não de criar um segundo

### Requirement: Acesso restrito a Owner e Sócio
A tela SHALL ser acessível apenas a usuários com `user_type` `owner` ou `socio`, independentemente de terem a role `societario` atribuída.

#### Scenario: Member com a role societario atribuída tenta acessar
- **WHEN** um usuário com `user_type = 'member'` e a role `societario` atribuída tenta acessar a tela de faturamento x teto
- **THEN** o sistema nega o acesso, pois a permissão depende do `user_type`, não da role atribuída
