## ADDED Requirements

### Requirement: Exibição da regra vigente com histórico
A tela SHALL exibir a regra de divisão de lucro e as condições de saída vigentes, com acesso ao histórico de versões anteriores.

#### Scenario: Consulta da regra vigente
- **WHEN** um Sócio/Owner acessa a tela de acordo de sociedade
- **THEN** a tela exibe a regra de divisão de lucro e as condições de saída atualmente vigentes, com um link para o histórico

### Requirement: Atualização da regra cria novo registro
Ao salvar uma alteração na regra de divisão de lucro ou nas condições de saída, a tela SHALL criar um novo registro versionado, deixando explícito que o anterior é preservado no histórico.

#### Scenario: Atualização da regra de divisão de lucro
- **WHEN** um Sócio/Owner atualiza a regra de divisão de lucro pela tela
- **THEN** o sistema cria um novo registro e a tela passa a exibi-lo como vigente, mantendo o anterior visível no histórico

### Requirement: Listagem de contribuições de capital por sócio
A tela SHALL exibir a lista de contribuições de capital, agrupadas por sócio, com valor, data e referência de comprovante.

#### Scenario: Consulta de contribuições
- **WHEN** um Sócio/Owner acessa a seção de contribuições de capital
- **THEN** a tela exibe as contribuições agrupadas por sócio, com o total contribuído por cada um

### Requirement: Registro de nova contribuição de capital
A tela SHALL permitir registrar uma nova contribuição de capital de um sócio, sem oferecer edição de uma contribuição já registrada.

#### Scenario: Registro de novo aporte
- **WHEN** um Sócio/Owner registra um novo aporte de capital de um sócio
- **THEN** o sistema persiste o registro e a tela passa a exibi-lo na lista, sem permitir editar aportes já existentes

### Requirement: Acesso restrito a Owner e Sócio
A tela SHALL ser acessível apenas a usuários com `user_type` `owner` ou `socio`, independentemente de terem a role `societario` atribuída.

#### Scenario: Member com a role societario atribuída tenta acessar
- **WHEN** um usuário com `user_type = 'member'` e a role `societario` atribuída tenta acessar a tela de acordo de sociedade
- **THEN** o sistema nega o acesso, pois a permissão depende do `user_type`, não da role atribuída
