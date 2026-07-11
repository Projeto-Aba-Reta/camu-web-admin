# gestao-de-disponibilidade-por-canal

## Purpose

Tela de gestão da disponibilidade de peças por canal de venda: ativação/desativação independente por canal, pré-preenchimento do preço praticado a partir do cálculo vinculado, exigência de motivo ao sobrescrever o preço sugerido, e controle de acesso por role.

## Requirements

### Requirement: Ativação de canal com preço pré-preenchido
Ao ativar um canal para uma peça vinculada a um cálculo de preço, o sistema SHALL pré-preencher o preço praticado com o preço sugerido daquele canal no cálculo vinculado, permitindo o usuário sobrescrever.

#### Scenario: Ativação de canal com cálculo vinculado
- **WHEN** um usuário ativa o canal `mercado_livre` para uma peça que tem um cálculo de preço vinculado
- **THEN** o sistema pré-preenche o campo de preço praticado com o preço sugerido para esse canal no cálculo

### Requirement: Registro de motivo ao sobrescrever o preço sugerido
Quando o usuário altera o preço praticado para um valor diferente do preço sugerido, o sistema SHALL exigir o preenchimento de um motivo antes de salvar.

#### Scenario: Alteração de preço sem motivo
- **WHEN** um usuário altera o preço praticado para um valor diferente do sugerido e tenta salvar sem preencher o motivo
- **THEN** o sistema bloqueia o salvamento e solicita o motivo

### Requirement: Ativação e desativação independentes por canal
O sistema SHALL permitir ativar ou desativar a listagem de uma peça em um canal específico pela interface, sem afetar a listagem da mesma peça em outros canais.

#### Scenario: Desativação de um canal pela interface
- **WHEN** um usuário desativa o canal `shopee` para uma peça que também está listada na `amazon`
- **THEN** a tela reflete a listagem da `shopee` como inativa e a da `amazon` permanece inalterada

### Requirement: Acesso de gestão de disponibilidade por Produção e Vendas
O sistema SHALL permitir ativar, desativar e ajustar preço de listagens por canal a usuários `owner`/`socio` ou com role `producao` ou `marketplace-vendas`.

#### Scenario: Usuário de Vendas ajusta disponibilidade por canal
- **WHEN** um usuário com apenas a role `marketplace-vendas` ativa um novo canal para uma peça existente
- **THEN** o sistema aceita a ação normalmente
