# disponibilidade-por-canal

## Purpose

Controle de em quais canais de venda uma peça do catálogo está listada e qual o preço efetivamente praticado em cada canal, permitindo divergência (com motivo) em relação ao preço sugerido pelo cálculo de preço vinculado à peça, com ativação/desativação independente por canal.

## Requirements

### Requirement: Listagem de peça em um canal com preço próprio
O sistema SHALL permitir registrar que uma peça está listada em um canal de venda suportado, com um preço praticado próprio, independente do preço sugerido por qualquer cálculo vinculado.

#### Scenario: Peça listada no Mercado Livre com preço próprio
- **WHEN** uma peça é listada no canal `mercado_livre` com um preço praticado informado
- **THEN** o sistema persiste essa listagem com o preço informado, mesmo que divirja do preço sugerido do cálculo vinculado à peça

### Requirement: No máximo uma listagem por peça e canal
O sistema SHALL impedir mais de uma listagem ativa para a mesma combinação de peça e canal.

#### Scenario: Segunda listagem para o mesmo canal
- **WHEN** já existe uma listagem da peça no canal `shopee` e uma nova listagem para o mesmo canal é criada
- **THEN** o sistema rejeita a criação por violar a restrição de unicidade `(product_id, channel)`

### Requirement: Motivo obrigatório quando o preço diverge do sugerido
Quando o preço praticado em uma listagem divergir do preço sugerido pelo cálculo vinculado à peça, o sistema SHALL exigir um motivo de divergência registrado junto da listagem.

#### Scenario: Preço praticado diferente do sugerido sem motivo
- **WHEN** uma listagem é criada com preço diferente do preço sugerido e sem motivo de divergência preenchido
- **THEN** o sistema rejeita a operação até que um motivo seja informado

### Requirement: Ativação e desativação por canal independentes
O sistema SHALL permitir ativar ou desativar a listagem de uma peça em um canal específico sem afetar as listagens da mesma peça em outros canais.

#### Scenario: Desativação em um canal
- **WHEN** a listagem de uma peça no canal `amazon` é desativada
- **THEN** as listagens dessa mesma peça em outros canais permanecem inalteradas

### Requirement: Escrita liberada a Produção e Marketing
O sistema SHALL permitir criar, atualizar e desativar listagens por canal a usuários `owner`/`socio` ou com role `producao` ou `marketing`, com leitura ampla equivalente à leitura de peças.

#### Scenario: Usuário de Marketing ajusta preço praticado em um canal
- **WHEN** um usuário com apenas a role `marketing` atualiza o preço praticado de uma listagem existente
- **THEN** o sistema aceita a atualização, pois a escrita de disponibilidade por canal é liberada para essa role

