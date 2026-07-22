## ADDED Requirements

### Requirement: Canal de venda loja própria (site)
O sistema SHALL suportar `loja_propria` como canal de venda, representando a venda direta na loja do site da Camu, com `listed_price` próprio (o preço praticado no site) e ativação/desativação independentes, como qualquer outro canal. Uma peça SHALL ser considerada **publicada na loja própria** quando tiver uma listagem `loja_propria` com `is_active = true`.

#### Scenario: Publicar peça na loja própria com preço do site
- **WHEN** um usuário autorizado cria uma listagem no canal `loja_propria` para uma peça, com um preço praticado informado, e a mantém ativa
- **THEN** o sistema persiste a listagem e a peça passa a ser considerada publicada na loja própria, com esse preço como preço do site

#### Scenario: Despublicar da loja própria sem afetar marketplaces
- **WHEN** a listagem `loja_propria` de uma peça é desativada
- **THEN** a peça deixa de ser considerada publicada na loja própria, e suas listagens em canais de marketplace permanecem inalteradas

### Requirement: Loja própria não exige motivo de divergência de preço
Como o cálculo de preço vinculado à peça não emite preço sugerido para o canal `loja_propria`, o sistema SHALL NOT exigir motivo de divergência ao definir o `listed_price` desse canal, mantendo a exigência de motivo apenas para os canais que têm preço sugerido.

#### Scenario: Preço do site definido livremente
- **WHEN** um usuário define o `listed_price` de uma listagem `loja_propria` sem preencher motivo de divergência
- **THEN** o sistema aceita a operação, pois não há preço sugerido para comparar nesse canal

#### Scenario: Marketplace continua exigindo motivo
- **WHEN** o mesmo usuário define, para a mesma peça, um `listed_price` no canal `mercado_livre` divergente do preço sugerido e sem motivo
- **THEN** o sistema rejeita a operação no canal `mercado_livre`, preservando a regra de motivo obrigatório para canais com preço sugerido
