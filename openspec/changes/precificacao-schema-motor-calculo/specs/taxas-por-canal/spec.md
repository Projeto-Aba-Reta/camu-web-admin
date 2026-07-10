## ADDED Requirements

### Requirement: Taxas de comissão por canal versionadas por vigência
O sistema SHALL manter, para cada canal de venda suportado (Mercado Livre, Shopee, TikTok Shop, Amazon, SHEIN), um percentual de comissão e uma taxa fixa opcional, versionados por `valid_from`, sem sobrescrever registros existentes ao alterar um valor.

#### Scenario: Ajuste de taxa de um canal
- **WHEN** a comissão percentual do Mercado Livre muda
- **THEN** o sistema cria um novo registro de taxa para esse canal com `valid_from = now()`, preservando o anterior

### Requirement: Canal restrito a um conjunto fechado
O sistema SHALL aceitar apenas os canais `mercado_livre`, `shopee`, `tiktok_shop`, `amazon` e `shein` como valores válidos de canal, rejeitando qualquer outro valor.

#### Scenario: Tentativa de cadastrar canal não suportado
- **WHEN** um usuário tenta registrar uma taxa para um canal fora da lista suportada
- **THEN** o sistema rejeita a operação por violar a restrição de valores válidos

### Requirement: Taxa vigente por canal é a mais recente
O sistema SHALL considerar vigente, para cada canal, a taxa cujo `valid_from` seja o mais recente dentre os que já ocorreram, de forma independente por canal.

#### Scenario: Cálculo consulta taxa vigente da Shopee
- **WHEN** o motor de cálculo precisa da taxa vigente da Shopee
- **THEN** o sistema retorna o registro de `channel_fees` com canal `shopee` e maior `valid_from` menor ou igual ao momento atual, independentemente da vigência de outros canais

### Requirement: Acesso restrito a Owner, Sócio e role Financeiro
O sistema SHALL permitir leitura das taxas por canal a `owner`/`socio` ou role `financeiro`/`producao`, e escrita apenas a `owner`/`socio` ou role `financeiro`.

#### Scenario: Usuário de Produção tenta alterar taxa de canal
- **WHEN** um usuário com apenas a role `producao` tenta inserir uma nova taxa para um canal
- **THEN** o sistema rejeita a escrita, pois taxas de canal são responsabilidade financeira
