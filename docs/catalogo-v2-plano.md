# Catálogo V2 — admin simples, vitrine moderna

Status: **implementado (MVP) — aguardando `make db-push` e teste manual.** Entregue: migration `20261104120000_vitrine_v2.sql` (`store_products`, `store_product_media`, `store_variants`, `order_items.store_product_id/store_variant_id`, view `storefront_products_v`, RLS/Storage), área admin `/vitrine` (lista, novo, editor com fotos/variantes/selos/prazo/SEO, publicar/duplicar/arquivar/destacar), preço da miniatura em `/vendas/configuracoes`, e na landing `/loja` + `/loja/[slug]` (flag `STORE_V2`). **Fica para depois:** coleções, produtos relacionados manuais (hoje por categoria), avaliações por produto, cotação de frete por CEP na página do produto, eventos de analytics por produto, remoção do V1 (Fase 6). Substitui o fluxo atual de catálogo (`/producao/catalogo`), que será depreciado.

> **Contexto:** hoje existe um único produto vendido, a **miniatura de pet**, com fluxo próprio (`/miniatura-pet`). Por isso a V2 é um **catálogo novo, construído do zero**, sem migração de legado — e a miniatura fica **fora do catálogo**, intocada (ver §2.1).

## 1. Diagnóstico (estado atual)

**Admin hoje** (`src/components/catalogo/`, ~2.7k linhas, 14 componentes) — para publicar *uma* peça na loja o usuário passa por:
categoria + porte + status + tipo (simples/composta) + vínculo com cálculo de preço + listagem por canal (com `price_override_reason` obrigatório se divergir do sugerido) + slug + prazo mín/máx + mídia + partes/componentes + ficha de fatiamento + "maturidade do catálogo".
Isso mistura **três assuntos**: produção (fatiamento, partes, estoque), precificação (cálculo, canais, taxas) e **vitrine** (nome, foto, preço, texto). A vitrine é o que o marketing precisa, e hoje está enterrada.

**Landing hoje** (`src/lib/store.ts`, `CatalogClient.tsx`, `loja/[id]`) — consome só: `id, name, description, category, size_tier, price, capa`.
Faltam: slug na URL (usa uuid), galeria, selo/promoção, destaques, coleções, busca/ordenação, variantes, produtos relacionados, SEO/JSON-LD, prova social no produto. Variante é hardcoded `"Padrão"`.

## 2. Princípio da V2

> **Separar "Produto de vitrine" (marketing, simples) de "Peça de produção" (ERP, avançado) e ligar os dois por um vínculo opcional.**

Quem cadastra para vender preenche **só a vitrine**. Custo, fatiamento e estoque continuam existindo, mas não bloqueiam a publicação.

## 2.1 Miniatura de pet: item fora do catálogo

A miniatura **não entra na vitrine V2** — nem agora, nem depois. Ela continua exatamente como é, e a V2 só pode ser construída de modo a **não tocar** nela.

**O que a miniatura usa do catálogo (e continua usando):**
1. **Leitura de preço:** `product_channel_listings.listed_price` (canal `loja_propria`) dos 2 produtos em `products`, ids em `PET_MINIATURE_PRODUCT_ID_SEM_PINTURA` / `_COM_PINTURA`.
2. **Pedido:** `orders` / `order_items` (com `order_items.product_id` → `products`).

**Regras de isolamento:**
- Esses 2 registros em `products` + listing `loja_propria` ficam como estão. **A V2 nunca lê, escreve nem migra** esses registros; `store_*` não os referencia.
- Nenhum item da miniatura aparece em `/loja`, `storefront_products_v`, coleções, busca ou sitemap (a view só lê `store_products`, então isso é automático).
- `getPetMiniaturePricing()` e `app/actions/pet-miniature.ts` **não mudam**. O filtro `petMiniatureProductIds()` em `store.ts` some junto com o `getProducts` legado (deixa de ser necessário, pois o catálogo novo não enxerga `products`).
- `order_items.product_id` tem FK para `products`. Pedidos da loja V2 **não** reaproveitam essa coluna: adicionamos `order_items.store_product_id` (nullable, FK `on delete set null`) e `store_variant_id`; `product_id` continua sendo usado só pela miniatura e pelo histórico. Isso mantém `/conta`, acompanhamento e funil funcionando para os dois tipos de pedido.

**Consequência para o admin — o que NÃO pode ser removido na depreciação:** hoje o preço da miniatura é editado pelo formulário de listagem do catálogo antigo. Ao depreciar `/producao/catalogo`, precisa existir um lugar para isso. Proposta: um campo simples **"Preço da miniatura (sem pintura / com pintura)"** em `/vendas/configuracoes` (ou no board `/vendas/miniaturas`), que atualiza os 2 listings e preserva a regra de divergência só se houver cálculo vinculado. Sem isso, a Fase 6 deixa a miniatura sem como reprecificar.

## 3. Modelo de dados (migration no admin — `make db-push`)

Novas tabelas (prefixo `store_`), **sem alterar** as antigas durante a transição:

| Tabela                     | Campos principais                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store_products`         | `id`, `slug` (único, auto), `title`, `short_description`, `description_md`, `price_cents`, `compare_at_price_cents` (preço "de"), `status` (`rascunho`/`publicado`/`arquivado`), `badges text[]` (`novo`, `mais_vendido`, `edicao_limitada`, `sob_encomenda`), `highlights text[]` (3–5 bullets), `fulfillment` (`sob_encomenda`/`pronta_entrega`), `lead_days_min/max`, `featured_rank int null`, `seo_title/seo_description` (nullable → gerados), `production_product_id` → `products.id` **nullable** (vínculo opcional com a peça de produção), `published_at`, timestamps |
| `store_product_media`    | `product_id`, `storage_path`, `position`, `alt_text`, `kind` (`image`/`video`); capa = posição 0 (sem `is_cover`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `store_variants`         | `product_id`, `label` ("Pequena", "Pintada"), `price_delta_cents`, `sku`, `position`, `active` — substitui o `"Padrão"` hardcoded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `store_collections`      | `slug`, `title`, `description`, `cover_path`, `starts_at/ends_at` (sazonal: Dia dos Pais, Natal), `position`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `store_collection_items` | `collection_id`, `product_id`, `position`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `store_product_links`    | `product_id`, `related_id`, `kind` (`relacionado`/`combina_com`) — cross-sell                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Contrato estável para a landing: **view `storefront_products_v`** (só `publicado`, com mídia/variantes/coleções agregadas em JSON). A landing lê a view, não as tabelas — o admin pode refatorar por dentro sem quebrar o site.

Regras que viram **validação na gravação, não burocracia na UI**:

- Publicar exige só: título + ≥1 foto + preço > 0. Slug, SEO e capa são automáticos.
- Preço "de" deve ser > preço atual (senão é ignorado).
- Sem `price_override_reason` na vitrine. O motor de precificação aparece como **dica** ("sugerido R$ X · margem Y%") se houver `production_product_id`.

## 4. Admin V2 — o que o usuário vê

Rota nova: `/vitrine` (área **Vitrine**, role `site`/marketing; a role `site` já existe sem tela).

1. **Lista** — grid com foto, preço, status, badges; busca; ações em lote (publicar/arquivar/duplicar); arrastar para ordenar destaques.
2. **Novo produto em 3 passos** (cabe em 1 minuto):
   1. Fotos (upload múltiplo, 1ª = capa) + nome
   2. Preço (+ "de/por" opcional) + descrição curta + até 5 destaques
   3. Revisão com **preview real da página de produto** → **Publicar**
3. **Editar** — uma página só, seções recolhíveis: *Básico* (aberto) · *Variantes* · *Coleções e selos* · *Prazo* · *SEO* · *Avançado* (vínculo com peça de produção, relacionados).
4. **Coleções** — CRUD mínimo (título, período, produtos).
5. **Checklist de qualidade** (substitui "maturidade do catálogo"): ≥3 fotos, descrição > N caracteres, destaques preenchidos, prazo informado — só sugere, nunca bloqueia.

Fica **fora** da vitrine e permanece em Produção/Precificação: fatiamento, partes/compostas, estoque, cálculo de preço, canais de marketplace.

## 5. Landing V2 — catálogo e produto

**`/loja`**: hero de coleção sazonal; filtros (categoria, coleção, faixa de preço) + busca + ordenação (destaques, preço, novidades); card com selo, preço "de/por", prazo, *quick add*; skeletons; chips de coleção; paginação/scroll infinito.

**`/loja/[slug]`** (uuid antigo → 301 para slug): galeria com zoom/swipe; seletor de variante; destaques em bullets; bloco "feito sob encomenda · chega em X–Y dias" + **cotação de frete por CEP** (já existe em `lib/shipping`); CTA fixo no mobile; "combina com" / relacionados; FAQ curto; selos de confiança (já há `FaixaConfianca`/`ProvaSocial`).

**SEO**: `generateMetadata` com `seo_title/description`, OG com foto de capa, JSON-LD `Product` + `Offer`, `sitemap.xml` com produtos e coleções.

**Marketing/medição** (PostHog + Vercel Analytics já instalados): eventos `view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` com `slug`/coleção; funil por produto no admin (reaproveita `/vendas/funil`).

**Mantém**: identidade Sticker Pop, carrinho em localStorage (chave passa a `productId+variantId`), recálculo de preço no servidor (a partir de `store_products`/`store_variants`), pagamento, e `/miniatura-pet` **inalterada** (ids por env var, ver §2.1).

## 6. Estratégia de entrega (V2 substitui V1)

Sem legado de catálogo a migrar, **não há backfill nem coexistência longa**: constrói-se a V2, cadastra-se o primeiro produto novo e desliga-se o V1.

1. **Fase 0 — Decisões** (§8) e congelar features novas no catálogo atual.
2. **Fase 1 — Schema**: migration `store_*` + `order_items.store_product_id/store_variant_id` + view `storefront_products_v` + pasta de mídia (reusa bucket `product-media`). Não toca `products` nem os listings da miniatura.
3. **Fase 2 — Admin `/vitrine`** (lista, wizard, editar, coleções) com testes de service no padrão `catalog-service.test.ts`. Sidebar: V1 marcada "legado".
4. **Fase 3 — Landing V2** atrás de flag `STORE_V2` (`src/lib/features.ts`): `src/lib/storefront.ts` lendo a view; `/loja`, `/loja/[slug]`; checkout recalcula preço em `store_products`/`store_variants` e grava `store_product_id`. `getPetMiniaturePricing` e o fluxo da miniatura ficam de fora.
5. **Fase 4 — Preço da miniatura no admin**: tela mínima de reprecificação (§2.1), **antes** de remover o V1.
6. **Fase 5 — Cutover**: cadastrar os primeiros produtos reais, ligar `STORE_V2`, **teste ponta a ponta dos dois fluxos** (compra da loja V2 e miniatura: intake → prévia → aprovação → pagamento → `/conta`).
7. **Fase 6 — Depreciação do V1**: remover `/producao/catalogo` (telas de vitrine/listagem `loja_propria`), `STORE_V2`, `getProducts`/`getProductById` legados e `petMiniatureProductIds()`. **Permanecem:** tabelas `products`/`product_channel_listings` (miniatura, marketplaces e produção/precificação), fatiamento, estoque.

Cada fase é uma change OpenSpec própria, entregável e reversível isoladamente.

## 7. Riscos

- **Pedidos da miniatura** continuam usando `order_items.product_id`; qualquer código novo de pedido/funil/`/conta` deve tratar `product_id` **ou** `store_product_id` (um dos dois). Cobrir com teste.
- **Dois lugares de preço** (listing da miniatura × `store_products`) → intencional e isolado: miniatura = listing, resto = V2. Documentar para ninguém "unificar" por engano.
- **Remover o V1 sem a tela de preço da miniatura** → impede reprecificar; a Fase 4 é pré-requisito da Fase 6.
- **Schema no admin, consumo no site** → deploy do admin com `make db-push` **antes** da landing (erro "column not in schema cache").
- RLS: tabelas `store_*` com leitura admin por role; a landing continua via service role no servidor.

## 8. Decisões que preciso de você

1. ~~Vitrine separada da peça de produção~~ → **decidido:** separada (e miniatura fora do catálogo).
2. **Variantes** entram já na V2 (tamanho/cor) ou depois? (Não é mais necessário por causa da miniatura.)
3. **Coleções sazonais** e **selos** na primeira entrega, ou só catálogo + produto?
4. **Avaliações/depoimentos por produto** — agora ou fase futura?
5. Quem opera a vitrine: role existente `site`, `marketing` ou `producao`?
6. Onde fica o preço da miniatura: `/vendas/configuracoes` ou no board `/vendas/miniaturas`?
7. Escopo mínimo do MVP (sugestão: Fases 1–5 com variantes e selos, coleções depois).
