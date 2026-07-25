# etapas-do-funil-de-pedidos

## Purpose

Cadastro das etapas (colunas) do funil de pedidos, editável pelo time sem alteração de código: slug, nome, ordem, cor, ativa/arquivada, marcação de etapa inicial e final e marcação de etapa que exige impressora. Cobre o conjunto-semente de sete etapas do fluxo de produção, as invariantes de exatamente uma etapa inicial e uma final, a reordenação, o arquivamento com preservação de histórico e as regras de acesso.

## Requirements

### Requirement: Etapas do funil cadastráveis
O sistema SHALL manter um cadastro das etapas (colunas) do funil de pedidos, em que cada etapa tem `slug` único, nome exibível, posição de ordenação, cor de destaque, indicador de ativa/arquivada e a marcação de se exige impressora. O time SHALL poder criar, renomear, recolorir, reordenar e arquivar etapas sem alteração de código.

#### Scenario: Criação de etapa nova
- **WHEN** um usuário autorizado cria a etapa "Aguardando revisão" na posição entre "Embalando" e "Aguardando envio"
- **THEN** o sistema persiste a etapa ativa e o quadro passa a exibir a nova coluna naquela posição

#### Scenario: Renomear etapa não perde pedidos
- **WHEN** um usuário renomeia a etapa "Imprimindo" para "Em impressão"
- **THEN** os pedidos que estavam nessa etapa permanecem nela, agora sob o novo nome

### Requirement: Etapas semeadas do funil de produção
O sistema SHALL semear, em ordem, as etapas `pensando_modelagem` (Pensando na modelagem), `aguardando_impressao` (Aguardando impressão), `imprimindo` (Imprimindo), `aguardando_embalagem` (Aguardando embalagem), `embalando` (Embalando), `aguardando_envio` (Aguardando envio) e `enviado` (Enviado), com `pensando_modelagem` marcada como etapa inicial, `enviado` marcada como etapa final e `imprimindo` marcada como exigindo impressora. O seed SHALL ser idempotente, identificando etapas existentes por `slug`.

#### Scenario: Seed em banco sem etapas
- **WHEN** o seed de vendas roda contra um banco sem nenhuma etapa cadastrada
- **THEN** o sistema cria as sete etapas semente na ordem definida, com as marcações de inicial, final e exige-impressora

#### Scenario: Seed executado duas vezes
- **WHEN** o seed de vendas roda novamente após já ter rodado com sucesso
- **THEN** nenhuma etapa é duplicada, e reordenações e renomeações feitas pelo time não são revertidas

### Requirement: Exatamente uma etapa inicial e uma etapa final
O sistema SHALL garantir que exista sempre exatamente uma etapa marcada como inicial e exatamente uma marcada como final entre as etapas ativas. Ao marcar outra etapa como inicial (ou final), o sistema SHALL desmarcar automaticamente a anterior.

#### Scenario: Troca da etapa inicial
- **WHEN** um usuário marca "Aguardando impressão" como etapa inicial
- **THEN** o sistema passa a tratá-la como inicial e desmarca "Pensando na modelagem", sem mover nenhum pedido já existente

#### Scenario: Arquivar a etapa inicial
- **WHEN** um usuário tenta arquivar a etapa atualmente marcada como inicial
- **THEN** o sistema rejeita a operação, informando que outra etapa precisa ser marcada como inicial antes

### Requirement: Reordenação das etapas
O sistema SHALL permitir reordenar as etapas, refletindo a nova ordem na exibição do quadro para todos os usuários, sem alterar a etapa em que cada pedido se encontra.

#### Scenario: Mover coluna para o começo
- **WHEN** um usuário move a etapa "Embalando" para a primeira posição
- **THEN** o quadro passa a exibir "Embalando" como primeira coluna e os pedidos permanecem nas suas etapas

#### Scenario: Posições duplicadas
- **WHEN** uma reordenação resultaria em duas etapas ativas com a mesma posição
- **THEN** o sistema normaliza as posições de forma que cada etapa ativa tenha uma posição distinta

### Requirement: Arquivamento de etapa exige quadro vazio naquela coluna
O sistema SHALL permitir arquivar uma etapa apenas quando nenhum pedido estiver nela, retirando-a do quadro e das opções de movimentação, mas preservando-a no histórico de etapas dos pedidos que já passaram por ela. O sistema SHALL rejeitar a exclusão de uma etapa referenciada por qualquer pedido ou histórico.

#### Scenario: Arquivar etapa com pedidos
- **WHEN** um usuário tenta arquivar uma etapa que tem 3 pedidos
- **THEN** o sistema rejeita a operação, informando quantos pedidos precisam ser movidos antes

#### Scenario: Arquivar etapa vazia
- **WHEN** um usuário arquiva uma etapa sem nenhum pedido
- **THEN** a etapa deixa de aparecer no quadro, e o histórico dos pedidos que passaram por ela continua legível

### Requirement: Etapa que exige impressora
O sistema SHALL permitir marcar qualquer etapa como exigindo impressora, o que faz a movimentação de um pedido para ela pedir em qual impressora do parque o pedido está.

#### Scenario: Marcar outra etapa como exigindo impressora
- **WHEN** um usuário marca a etapa "Aguardando embalagem" como exigindo impressora
- **THEN** movimentações posteriores de pedidos para essa etapa passam a solicitar a impressora

#### Scenario: Desmarcar a exigência
- **WHEN** um usuário desmarca "exige impressora" da etapa "Imprimindo"
- **THEN** movimentações posteriores para essa etapa não solicitam mais impressora, e as impressoras já registradas em pedidos permanecem

### Requirement: Acesso ao cadastro de etapas do funil
O sistema SHALL permitir leitura das etapas a `owner`/`socio` ou às roles `vendas`, `producao` e `financeiro`, e escrita (criar, editar, reordenar, arquivar) apenas a `owner`/`socio` ou à role `vendas`.

#### Scenario: Produção tenta criar etapa
- **WHEN** um usuário com apenas a role `producao` tenta criar uma etapa do funil
- **THEN** o sistema rejeita a operação, permitindo-lhe apenas visualizar o quadro
