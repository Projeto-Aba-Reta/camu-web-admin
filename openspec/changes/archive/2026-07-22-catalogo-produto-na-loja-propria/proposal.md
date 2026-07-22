## Why

O site voltado ao cliente (`camu-web-landing-page`) ganhou uma loja própria com fluxo de compra completo (catálogo → produto → carrinho → checkout → pedido). Ele consome o catálogo deste ERP, mas o **cadastro de peça** hoje não tem o necessário para publicar uma peça na loja do site:

- não existe um canal de venda "loja própria" — só marketplaces —, então não há onde definir *o que* vai pro site nem *por qual preço*;
- a peça não tem **slug** (URL amigável) — o site hoje precisa cair na `id` uuid;
- não há **prazo de produção** exibível ("feito sob encomenda · X dias");
- não há um conceito de "peça pronta pra publicar no site" que garanta que ela tenha capa, preço e os campos mínimos antes de aparecer pro cliente.

A integração já criou o valor de canal `loja_propria` (na migration `20260722120000_pedidos_loja_e_canal_site.sql`, junto das tabelas de pedido). Esta mudança **formaliza esse canal no cadastro** e adiciona os campos e a UI que faltam para o time gerir o que a loja mostra — sem construir a vitrine em si (isso mora no `camu-web-landing-page`).

## What Changes

- **Canal `loja_propria`** vira um canal de venda de primeira classe em `disponibilidade-por-canal`: a peça é publicada no site tendo uma listagem `loja_propria` ativa, com `listed_price` próprio (o preço do site). Diferente dos marketplaces, o motor de preço não emite preço sugerido para esse canal, então não se exige motivo de divergência (a margem-alvo B2C pode orientar, mas não é imposta).
- **Novos campos no cadastro de peça** (`catalogo-de-pecas`): `slug` (único, gerado do nome, editável), prazo de produção estimado (faixa em dias) e a regra de "peça pronta para publicar na loja própria".
- **Tela de cadastro/edição de peça** (`gestao-de-catalogo`) ganha os campos do site, uma seção "Vender na loja própria (site)" com toggle + preço, e um indicador do que ainda falta pra peça poder ir ao ar; a listagem passa a sinalizar quais peças estão publicadas no site.
- A descrição pública exibida na loja é a `description` já existente da peça (fica explícito no cadastro).

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `disponibilidade-por-canal`: adiciona o canal `loja_propria` (venda direta no site) e a semântica de "publicado na loja própria".
- `catalogo-de-pecas`: adiciona `slug`, prazo de produção e a regra de prontidão para publicação na loja própria.
- `gestao-de-catalogo`: cadastro/edição de peça passam a expor os campos de site e a publicação na loja própria; listagem indica peças publicadas.

## Impact

- **Domínio de gestão afetado**: Produção/catálogo (dono do cadastro de peça) e Vendas/canais (habilita o canal "site" ao lado dos marketplaces).
- **Dependência com camu-docs**: alinha-se à **fase 2** do modelo de negócio (site + backend), em que o canal próprio entra ao lado dos marketplaces; sem dependência com regras financeiras ou de migração MEI/ME.
- **Banco**: `alter table products` (adicionar `slug`, prazo de produção). O valor de canal `loja_propria` já foi adicionado na migration `20260722120000_pedidos_loja_e_canal_site.sql` — esta mudança não recria o enum, só passa a usá-lo no cadastro. Nenhuma tabela nova.
- **UI**: tela de cadastro/edição de peça e listagem do catálogo.
- **Cross-repo**: consumido pelo `camu-web-landing-page`, que lê `slug`, prazo e a listagem `loja_propria` para montar a loja. Mudança de contrato de leitura combinada entre os dois repos.
