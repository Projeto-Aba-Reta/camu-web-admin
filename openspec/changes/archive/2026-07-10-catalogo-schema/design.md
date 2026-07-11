## Context

O motor de cálculo de preço (`precificacao-schema-motor-calculo`) já existe e produz `price_calculations` com custo, porte sugerido e preço por canal — mas hoje esses cálculos existem soltos, sem vínculo com nenhuma peça real. O `camu-docs` já define as 4 categorias de canal (`06-marketplace/estrategia-canais.md`) e deixa explícito que essas categorias são um eixo diferente do porte P/M/G (`custo-por-peca.md`): categoria decide canal de venda, porte decide custo/preço. O schema de catálogo precisa capturar os dois eixos de forma independente.

## Goals / Non-Goals

**Goals:**
- Entidade `products` como fonte única da verdade do catálogo autoral, com categoria de canal e porte como campos independentes.
- Vínculo opcional e não obrigatório com `price_calculations` — uma peça pode existir sem cálculo ainda (rascunho), e o preço final pode ser sobrescrito manualmente.
- Suporte a múltiplas fotos por peça com controle de ordem/capa.
- Rastrear em quais canais uma peça está efetivamente à venda e a que preço, permitindo divergência do preço sugerido.

**Non-Goals:**
- Quantidade em estoque/produzida por peça (fica em `estoque-schema`).
- Upload de arquivo/processamento de imagem (fica em `catalogo-telas`, que só grava a referência do arquivo já hospedado).
- Fila de produção ou cruzamento peça × assinante (fora do escopo dos 4 change abordados neste roadmap).
- Importação em lote de peças existentes de marketplace (não há dado migrável ainda — catálogo nasce vazio).

## Decisions

### 1. Categoria de canal e porte como colunas independentes em `products`
`category text CHECK (category in ('miniatura_colecionavel','personalizado','utilitario','linha_leon'))` e `size_tier text CHECK (size_tier in ('P','M','G'))` vivem lado a lado na mesma tabela, sem uma depender da outra — reflete a ressalva explícita do `camu-docs` de que são eixos diferentes (categoria define canal/impressora mais adequada, porte define custo/preço). **Alternativa considerada**: modelar categoria como uma tabela própria (`product_categories`) em vez de CHECK constraint. Rejeitada pelos mesmos motivos já aceitos em `channel_fees` no change de precificação — lista pequena e fechada, mudança rara e ligada a decisão de negócio, não a cadastro frequente de usuário.

### 2. Vínculo com `price_calculations` opcional e sobrescrevível
`products.price_calculation_id references price_calculations(id)`, nullable. Ao vincular, o service de catálogo copia o porte sugerido e uma sugestão de preço por canal para dentro de `product_channel_listings` como valor inicial — mas o preço em `product_channel_listings` é um campo próprio, editável independentemente do cálculo. **Motivo**: preço final de venda pode divergir do sugerido (arredondamento de marketing, promoção, ajuste de posicionamento) sem que isso invalide o cálculo de custo subjacente — separar os dois evita ter que recalcular o motor de preço só para registrar um ajuste comercial.

### 3. `product_media` com ordem e capa, sem processamento de imagem no schema
`product_media`: `id`, `product_id references products(id) on delete cascade`, `storage_path text` (referência ao arquivo já hospedado, ex. Supabase Storage), `display_order int`, `is_cover boolean default false`, `created_at`. Constraint garantindo no máximo uma `is_cover = true` por `product_id` (índice único parcial). O schema não sabe nada sobre redimensionamento/otimização de imagem — isso é responsabilidade da camada de upload na UI (`catalogo-telas`).

### 4. `product_channel_listings` como tabela de associação com preço próprio
`product_channel_listings`: `id`, `product_id references products(id) on delete cascade`, `channel text` (mesma lista fechada de `channel_fees`), `listed_price numeric`, `is_active boolean default true`, `price_override_reason text nullable` (preenchido quando `listed_price` diverge do preço sugerido do cálculo vinculado), `unique(product_id, channel)` — uma peça tem no máximo uma listagem ativa por canal. **Alternativa considerada**: guardar `listed_price` direto em `products` como um jsonb por canal (espelhando `price_calculations.channel_prices`). Rejeitada porque cada listagem por canal precisa de seu próprio ciclo de vida (ativar/desativar em um canal sem afetar os outros), o que pede linhas, não um blob.

### 5. RLS por papel de domínio, reaproveitando funções existentes
Leitura de `products`/`product_media` ampla: `is_socio_or_owner() OR has_role('producao') OR has_role('financeiro') OR has_role('marketplace-vendas')`. Escrita de `products`/`product_media` restrita a `is_socio_or_owner() OR has_role('producao')` (dono do catálogo autoral). Escrita de `product_channel_listings` liberada também a `has_role('marketplace-vendas')`, já que decidir onde/por quanto vender é operação de canal, não de produção. **Trade-off aceito**: mesma dependência de slugs reais do seed já assumida em `precificacao-schema-motor-calculo` — reforça a necessidade de manter esses slugs estáveis entre changes.

## Risks / Trade-offs

- **[Risco]** Categoria e porte como CHECK constraints fixos exigem migration para adicionar uma 5ª categoria ou revisar as faixas P/M/G. → **Mitigação**: aceito conscientemente, mesmo raciocínio de `channel_fees`; mudança de categoria é decisão de negócio rara e documentada no log de decisões do `camu-docs`.
- **[Risco]** Preço em `product_channel_listings` divergente do cálculo sugerido pode acumular sem que ninguém revise se ainda cobre o custo real. → **Mitigação**: campo `price_override_reason` obrigatório quando há divergência, tornando o desvio visível/auditável na UI; revisão periódica fica registrada como responsabilidade operacional (Sinais de alerta de `controle-financeiro.md`), não como validação de banco.
- **[Risco]** `product_media` referencia `storage_path` sem validar que o arquivo realmente existe no storage. → **Mitigação**: aceito — validação de existência de arquivo é responsabilidade da camada de upload (`catalogo-telas`), o schema só registra a referência.

## Migration Plan

1. `supabase/migrations/<timestamp>_catalogo_produtos_midia_canais.sql`: cria `products`, `product_media`, `product_channel_listings`, RLS e policies.
2. Sem seed de dados neste change — catálogo nasce vazio, populado pela UI de `catalogo-telas`.
3. Aplicar local via `supabase db reset`; em ambientes hospedados via `supabase db push`.
4. Rollback: sem dado de produção dependente (tabelas novas) — `drop table` é seguro nesta fase.

## Open Questions

- Onde hospedar as fotos (Supabase Storage vs. outro provedor) é decisão de `catalogo-telas` — este change só assume que `storage_path` é uma string opaca resolvível pela UI.
- Se/quando a peça precisar de variações (ex.: mesma peça em cores diferentes da linha Leon via AMS), avaliar se isso vira uma nova tabela `product_variants` ou um campo — não decidido aqui, registrado para revisão quando a demanda aparecer.
