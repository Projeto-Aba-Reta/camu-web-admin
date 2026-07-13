## MODIFIED Requirements

### Requirement: Planejamento de posts de redes sociais
O sistema SHALL permitir criar um item de planejamento de conteúdo com título, um ou mais canais, status inicial `ideia`, responsável, data alvo e notas, vinculando opcionalmente a uma data comemorativa cadastrada. Um item SHALL ter sempre pelo menos um canal.

#### Scenario: Criar post vinculado a uma data comemorativa
- **WHEN** um usuário cria um item de planejamento com título "Vídeo de unboxing de Natal", canal "TikTok" e vincula à data comemorativa "Natal"
- **THEN** o sistema cria o item com status `ideia` e o vínculo à data comemorativa registrado

#### Scenario: Criar post para várias redes de uma vez
- **WHEN** um usuário cria um item de planejamento selecionando Instagram, TikTok e Kwai (ou "todas as redes")
- **THEN** o sistema cria um único item cobrindo os três canais, que percorre o funil uma única vez — a mesma gravação é publicada nas três redes

#### Scenario: Criar post sem nenhum canal
- **WHEN** um usuário tenta criar ou editar um item de planejamento sem selecionar nenhum canal
- **THEN** o sistema rejeita a operação, informando que pelo menos um canal é obrigatório

#### Scenario: Criar post sem data comemorativa
- **WHEN** um usuário cria um item de planejamento sem selecionar nenhuma data comemorativa
- **THEN** o sistema cria o item normalmente, sem vínculo a nenhuma data
