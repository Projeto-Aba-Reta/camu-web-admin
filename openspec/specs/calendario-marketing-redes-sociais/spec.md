# calendario-marketing-redes-sociais

## Purpose

Lista de datas comemorativas voltada a marketing e planejamento de posts de redes sociais dentro da área Marketplace/Vendas. Cada data tem regra fixa (repete todo ano) ou móvel (ocorrência concreta do ciclo atual), e cada post percorre um funil linear `ideia` → `roteiro` → `gravacao` → `edicao` → `agendado` → `publicado`, com responsável, um ou mais canais, data alvo e vínculo opcional a uma data comemorativa. Um post cobre todas as redes em que aquele conteúdo será publicado: a mesma gravação vai para Instagram, TikTok e Kwai como um único item de funil, não como três. Oferece uma visão de calendário mensal (quando cada coisa acontece) e uma visão de board por status (o que está parado em qual etapa). É independente do organizador de ideação de produtos por data comemorativa: cada capability mantém sua própria lista de datas, por decisão explícita de manter os dois fluxos desacoplados. Não há integração com as redes sociais — `agendado` e `publicado` são status manuais, e métricas de performance de post ficam fora do escopo.
## Requirements
### Requirement: Cadastro de datas comemorativas para marketing
O sistema SHALL permitir cadastrar uma data comemorativa com nome, regra de data (fixa dd/mm ou móvel), categoria e indicador de ativa/inativa.

#### Scenario: Cadastro de data fixa
- **WHEN** um usuário autorizado cadastra a data comemorativa "Natal" com regra fixa 25/12
- **THEN** o sistema cria o registro como ativo, disponível para vincular a posts de conteúdo

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

### Requirement: Progressão de status do funil de conteúdo
O sistema SHALL permitir avançar o status de um item de planejamento pela sequência `ideia` → `roteiro` → `gravacao` → `edicao` → `agendado` → `publicado`, registrando o responsável de cada mudança.

#### Scenario: Avançar post de roteiro para gravação
- **WHEN** um usuário muda o status de um item de "roteiro" para "gravacao"
- **THEN** o sistema atualiza o status do item, mantendo o histórico de quem fez a alteração

### Requirement: Visão de calendário e de board
O sistema SHALL oferecer uma visão de calendário mensal (datas comemorativas e posts com data alvo no mês) e uma visão de board agrupando os itens de planejamento por status.

#### Scenario: Consultar calendário do mês
- **WHEN** um usuário abre a visão de calendário de um mês específico
- **THEN** o sistema exibe as datas comemorativas ativas daquele mês e os posts cuja data alvo cai naquele mês

#### Scenario: Consultar board por status
- **WHEN** um usuário abre a visão de board
- **THEN** o sistema exibe os itens de planejamento agrupados em colunas por status (ideia, roteiro, gravação, edição, agendado, publicado)

### Requirement: Acesso ao calendário de marketing
O sistema SHALL permitir cadastro e edição de datas comemorativas e itens de planejamento a usuários `owner`/`socio` ou com role `marketplace-vendas`.

#### Scenario: Usuário sem a role tenta criar item de planejamento
- **WHEN** um usuário sem `owner`/`socio` e sem a role `marketplace-vendas` tenta criar um item de planejamento de conteúdo
- **THEN** o sistema rejeita a escrita

