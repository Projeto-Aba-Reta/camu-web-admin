## 1. Schema / dados

- [x] 1.1 Migration: `alter table public.products` adicionando `slug text` (temporariamente nullable), `production_lead_days_min int`, `production_lead_days_max int` (checks: `>= 0` e `max >= min` quando ambos presentes)
- [x] 1.2 Backfill de `slug` a partir de `name` (slugify + desambiguação por sufixo numérico em colisão); depois tornar `slug` `not null` e criar `unique index products_slug_key`
- [x] 1.3 Confirmar que o valor de canal `loja_propria` já existe no check de `product_channel_listings.channel` (adicionado na migration `20260722120000_pedidos_loja_e_canal_site.sql`); não recriar o enum
- [ ] 1.4 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços

- [x] 2.1 Repositório/serviço de catálogo: aceitar `slug` (validar unicidade e formato `[a-z0-9-]`) e o prazo de produção no create/update de peça
- [x] 2.2 Serviço de disponibilidade por canal: tratar `loja_propria` como canal suportado (rótulo "Loja própria (site)"); reaproveitar RBAC atual (owner/socio/producao/marketing)
- [x] 2.3 Regra de prontidão: só permitir ativar a listagem `loja_propria` quando a peça estiver `ativo` e tiver `slug`, foto de capa e `listed_price` — retornando erro claro do que falta
- [x] 2.4 Expor no serviço de listagem um indicador "publicada no site" (existe listagem `loja_propria` ativa)

## 3. UI

- [x] 3.1 Formulário de cadastro/edição de peça: campo `slug` (auto a partir do nome, editável, com aviso de que trocar quebra links) e campos de prazo de produção (mín/máx dias)
- [x] 3.2 Formulário: deixar explícito que a `description` é o texto exibido pro cliente na loja
- [x] 3.3 Seção "Vender na loja própria (site)": toggle de publicar + campo de preço do site (cria/edita a listagem `loja_propria`), reusando o componente de disponibilidade por canal
- [x] 3.4 Indicador de prontidão na tela: mostrar o que falta (capa, preço, slug, status ativo) e bloquear o publicar enquanto faltar
- [x] 3.5 Listagem do catálogo: coluna/badge "no site" para peças publicadas na loja própria

## 4. Validação

- [x] 4.1 `openspec validate catalogo-produto-na-loja-propria --strict`
- [x] 4.2 Conferir com o `camu-web-landing-page` que a loja lê `slug`, prazo e a listagem `loja_propria` conforme este contrato
  - Conferido em `camu-web-landing-page/src/lib/store.ts`: a loja já lê a listagem `loja_propria` ativa (preço = `listed_price`), filtra `products.status = 'ativo'` e usa a capa de `product_media` — bate com o contrato desta mudança, e as colunas novas não quebram nada (o select é explícito e a loja não insere peças).
  - Pendente **no outro repo**: `getProductById` ainda busca por UUID (`UUID_RE`), não por `slug`, e nenhuma query lê `production_lead_days_min/max`. Adotar os dois é trabalho do `camu-web-landing-page`.
