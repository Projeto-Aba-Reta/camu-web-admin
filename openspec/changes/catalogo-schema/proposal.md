## Why

Com a Fase de Precificação pronta (`precificacao-schema-motor-calculo` + `precificacao-telas`), o painel já sabe calcular custo/porte/preço a partir de peso e tempo de impressão — mas ainda não existe o conceito de "peça" no sistema. Hoje o catálogo autoral só existe como planilha/anotação fora do painel. Sem uma entidade de peça persistida, não há como listar o catálogo, vincular fotos, decidir em quais canais uma peça é vendida, nem, mais adiante, alimentar o controle de estoque (`estoque-schema`) ou a fila de produção. Este change cria o schema; a UI de CRUD e mídia fica em `catalogo-telas`.

## What Changes

- Cria schema Supabase para **peças do catálogo** (`products`): nome, descrição, categoria de canal (miniatura/colecionável, personalizado, utilitário, linha Leon — conforme `camu-docs/06-marketplace/estrategia-canais.md`), porte (P/M/G, herdado do cálculo de preço mas ajustável manualmente), status (`rascunho`/`ativo`/`inativo`/`descontinuado`), e vínculo opcional com um `price_calculations.id` (o cálculo de preço que fundamenta o preço atual da peça).
- Cria schema para **mídia de peça** (`product_media`): fotos vinculadas a uma peça, com ordem de exibição e flag de capa.
- Cria schema para **disponibilidade por canal** (`product_channel_listings`): em quais canais (dos 5 suportados por `taxas-por-canal`) uma peça está listada, com o preço efetivamente praticado nesse canal (que pode divergir do preço sugerido, registrando o motivo).
- Cria trigger/regra que, ao vincular uma peça a um `price_calculations`, sugere automaticamente o porte e o preço por canal com base no resultado desse cálculo — sem impedir o usuário de sobrescrever manualmente (peça pode ter preço final diferente do sugerido).
- Habilita RLS: leitura ampla para Owner/Sócio e roles `producao`/`financeiro`/`marketplace-vendas` (quem vende precisa ver o catálogo); escrita de peça e mídia restrita a `producao` (quem cadastra/mantém o catálogo autoral) e Owner/Sócio; escrita de disponibilidade por canal também liberada a `marketplace-vendas`.

Não incluído neste change: telas de CRUD, upload de imagem, listagem/filtros (ficam em `catalogo-telas`); controle de quantidade em estoque por peça (fica em `estoque-schema`, que referencia `products`).

## Capabilities

### New Capabilities
- `catalogo-de-pecas`: cadastro de peças do catálogo autoral, com categoria de canal, porte, status e vínculo opcional com um cálculo de preço.
- `midia-de-peca`: fotos vinculadas a uma peça, com ordem de exibição e capa.
- `disponibilidade-por-canal`: em quais canais uma peça está listada e o preço efetivamente praticado em cada um.

### Modified Capabilities
(nenhuma — `motor-de-calculo-de-preco` não muda de requisito; este change só referencia `price_calculations` por chave estrangeira opcional, sem alterar seu comportamento)

## Impact

- **Depende de**: `precificacao-schema-motor-calculo` (referencia `price_calculations`), `taxas-por-canal` (lista fechada de canais reaproveitada em `product_channel_listings`), `controle-de-acesso` (roles `producao`, `financeiro`, `marketplace-vendas`).
- **Novo**: migrations para `products`, `product_media`, `product_channel_listings`; `src/lib/repositories/interfaces/{product,product-media,product-channel-listing}-repository.interface.ts` + implementações Supabase; `src/lib/services/catalog-service.ts`.
- **Domínio de gestão**: Produção/Catálogo (com leitura por Financeiro e escrita de disponibilidade por Vendas/Marketplace).
- **Dependência de `camu-docs`**: direta — as 4 categorias de canal (miniaturas/colecionáveis, personalizados, utilitários, linha Leon) vêm de `06-marketplace/estrategia-canais.md`; o porte P/M/G vem de `03-financeiro/custo-por-peca.md`, já modelado em `precificacao-schema-motor-calculo`.
- Habilita `catalogo-telas` (UI) e, mais adiante, `estoque-schema` (referencia `products` para rastrear quantidade produzida/disponível).
