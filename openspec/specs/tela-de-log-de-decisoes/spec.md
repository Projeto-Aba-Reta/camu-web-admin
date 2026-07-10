# Spec: Tela de Log de Decisões

## Purpose

Define o comportamento da tela de log de decisões, que exibe as entradas do log em formato de timeline e permite registrar novas entradas, sem oferecer edição ou exclusão de entradas já registradas.

## Requirements

### Requirement: Listagem em formato timeline, mais recente primeiro
A tela SHALL exibir as entradas do log de decisões em formato de timeline, ordenadas da mais recente para a mais antiga, com Contexto, Decisão, Alternativas Consideradas e Motivo visualmente separados.

#### Scenario: Consulta do log de decisões
- **WHEN** um Sócio/Owner acessa a tela de log de decisões
- **THEN** a tela exibe as entradas ordenadas da mais recente para a mais antiga, com as quatro seções de cada entrada claramente separadas

### Requirement: Registro de nova entrada
A tela SHALL permitir registrar uma nova entrada do log de decisões preenchendo título, contexto, decisão, alternativas consideradas, motivo e data da decisão.

#### Scenario: Registro de uma nova decisão
- **WHEN** um Sócio/Owner preenche e envia o formulário de nova entrada do log de decisões
- **THEN** o sistema persiste a entrada e ela passa a aparecer no topo da timeline

### Requirement: Nenhuma opção de edição de entrada existente
A tela SHALL não oferecer nenhuma ação de editar ou excluir uma entrada do log de decisões já registrada.

#### Scenario: Usuário tenta editar uma entrada existente
- **WHEN** um usuário visualiza uma entrada já registrada do log de decisões
- **THEN** a tela não exibe nenhuma ação de edição ou exclusão para essa entrada

### Requirement: Acesso restrito a Owner e Sócio
A tela SHALL ser acessível apenas a usuários com `user_type` `owner` ou `socio`, independentemente de terem a role `societario` atribuída.

#### Scenario: Member com a role societario atribuída tenta acessar
- **WHEN** um usuário com `user_type = 'member'` e a role `societario` atribuída tenta acessar a tela de log de decisões
- **THEN** o sistema nega o acesso, pois a permissão depende do `user_type`, não da role atribuída
