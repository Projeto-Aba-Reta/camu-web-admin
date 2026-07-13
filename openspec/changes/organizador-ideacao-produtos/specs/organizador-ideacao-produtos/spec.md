## ADDED Requirements

### Requirement: Cadastro de datas comemorativas para produto
O sistema SHALL permitir cadastrar uma data comemorativa relevante para criação de produto, com nome, regra de data (fixa dd/mm ou móvel), categoria e indicador de ativa/inativa.

#### Scenario: Cadastro de data fixa
- **WHEN** um usuário autorizado cadastra a data comemorativa "Dia dos Pais" com regra fixa (segundo domingo de agosto)
- **THEN** o sistema cria o registro como ativo, disponível para vincular a ideias de produto

### Requirement: Cadastro de ideia de produto
O sistema SHALL permitir criar uma ideia de produto com título, descrição, categoria, prioridade e responsável, vinculando opcionalmente a uma data comemorativa cadastrada.

#### Scenario: Criar ideia vinculada a uma data comemorativa
- **WHEN** um usuário cria uma ideia "Miniatura temática de Natal" na categoria `miniatura_colecionavel` e vincula à data comemorativa "Natal"
- **THEN** o sistema cria a ideia com status `ideia` e o vínculo à data comemorativa registrado

#### Scenario: Criar ideia sem data comemorativa
- **WHEN** um usuário cria uma ideia de produto sem selecionar nenhuma data comemorativa
- **THEN** o sistema cria a ideia normalmente, sem vínculo a nenhuma data

### Requirement: Progressão de status da ideia
O sistema SHALL permitir mudar o status de uma ideia entre `ideia`, `em_desenvolvimento`, `lancada` e `descartada`, preservando o histórico da ideia mesmo quando descartada.

#### Scenario: Mover ideia para em desenvolvimento
- **WHEN** um usuário muda o status de uma ideia de `ideia` para `em_desenvolvimento`
- **THEN** o sistema atualiza o status, mantendo os demais dados da ideia intactos

#### Scenario: Descartar ideia
- **WHEN** um usuário muda o status de uma ideia para `descartada`
- **THEN** o sistema mantém a ideia visível no histórico, apenas sinalizada como descartada, sem excluí-la

### Requirement: Visão de próximas datas comemorativas e board de ideias
O sistema SHALL exibir as próximas datas comemorativas ativas relevantes para produto e um board de ideias agrupadas por status.

#### Scenario: Consultar próximas datas
- **WHEN** um usuário abre a visão de datas comemorativas de produto
- **THEN** o sistema exibe as datas ativas ordenadas pela próxima ocorrência, com as ideias já vinculadas a cada uma

#### Scenario: Consultar board de ideias
- **WHEN** um usuário abre o board de ideias
- **THEN** o sistema exibe as ideias agrupadas em colunas por status (ideia, em desenvolvimento, lançada, descartada)

### Requirement: Acesso ao organizador de ideação de produtos
O sistema SHALL permitir cadastro e edição de datas comemorativas e ideias de produto a usuários `owner`/`socio` ou com role `ideacao-produtos`, e leitura a qualquer usuário autenticado.

#### Scenario: Usuário sem a role tenta criar ideia
- **WHEN** um usuário sem `owner`/`socio` e sem a role `ideacao-produtos` tenta criar uma nova ideia de produto
- **THEN** o sistema rejeita a escrita, permitindo apenas a leitura das ideias existentes
