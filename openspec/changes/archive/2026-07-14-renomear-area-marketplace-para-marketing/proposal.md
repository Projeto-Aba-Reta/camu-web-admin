## Why

A área hoje chamada **Marketplace/Vendas** não tem nenhuma tela de marketplace nem de vendas — a única tela publicada nela é o **calendário de marketing de redes sociais**. O nome promete um domínio (consolidação de vendas por canal, pré-venda por lote) que ainda não foi construído, e isso já vaza para o usuário: o item da sidebar diz "Marketplace/Vendas" e leva para `/marketplace/calendario`, que é um calendário de posts.

Renomear agora é barato justamente porque a área ainda só tem uma tela; cada tela nova de vendas construída sob o nome errado encarece a correção. O domínio de gestão afetado é **vendas/canais** (que passa a ser reservado, não implementado) e **marketing** (que passa a existir como área própria).

## What Changes

- **BREAKING** — a role `marketplace-vendas` é renomeada para `marketing` (slug e nome exibido: "Marketing"). Como `public.has_role(slug)` resolve por slug em tempo de consulta, **toda policy RLS que hoje literaliza `'marketplace-vendas'` para de conceder acesso no instante em que o slug muda** — a renomeação da linha em `roles` e a reescrita das policies têm de ocorrer na mesma migration/transação. São 27 referências em 5 migrations já aplicadas.
- **BREAKING** — a rota `/marketplace/calendario` passa a ser `/marketing/calendario` (o diretório `src/app/(dashboard)/marketplace/` vira `src/app/(dashboard)/marketing/`). Não há usuários externos nem links públicos; o impacto é limitado a bookmarks internos.
- Nasce a role **`vendas`** ("Vendas/Marketplace"), **sem nenhuma tela e sem nenhuma policy** — reserva o lugar do domínio que será construído depois. Sem entrada em `areaRoutes`, ela renderiza como item não-clicável na sidebar, comportamento já suportado por `navegacao-por-area`.
- Os sócios que hoje têm `marketplace-vendas` mantêm a atribuição: a linha em `roles` preserva o `id`, então `user_roles` continua válido — ninguém precisa ser reatribuído.
- Seeds (`scripts/seed-roles.ts`, `supabase/seed-hosted.sql`) e helpers de acesso (`marketing-calendar-access`, `catalog-access`, `inventory-access`) passam a falar `marketing`.

Explicitamente **fora de escopo**: qualquer tela de vendas/marketplace. Esta mudança só renomeia e reserva o nome.

## Capabilities

### New Capabilities
- Nenhuma. Nenhum comportamento novo é introduzido — a role `vendas` nasce vazia (sem tela e sem policy), e a reserva do slug está coberta pelo requisito de seed já existente.

### Modified Capabilities
Todas as capabilities abaixo nomeiam a role `marketplace-vendas` no texto de um requisito de acesso; o slug citado muda para `marketing`. A regra de quem pode o quê **não muda** em nenhuma delas — muda apenas o nome da role que carrega o direito.

- `seed-de-dados-iniciais`: a lista de roles semeadas troca "Marketplace/Vendas" por "Marketing" e ganha "Vendas/Marketplace" (`vendas`), sem tela.
- `calendario-marketing-redes-sociais`: role de acesso vira `marketing`; a área passa a se chamar Marketing e sua página padrão vira `/marketing/calendario`.
- `catalogo-de-pecas`: role de leitura do catálogo vira `marketing`.
- `gestao-de-catalogo`: idem, no lado de gestão.
- `composicao-de-produto`: role de leitura da composição vira `marketing`.
- `disponibilidade-por-canal`: role de gestão de disponibilidade vira `marketing`.
- `gestao-de-disponibilidade-por-canal`: idem, no lado de gestão.
- `gestao-de-midia-de-peca`: role de leitura de mídia vira `marketing`.
- `ficha-de-fatiamento`: role de leitura da ficha vira `marketing`.
- `indicador-de-estoque-baixo`: role de leitura do indicador vira `marketing`.

## Impact

**Banco (o ponto de risco real).** Uma migration nova — as 5 migrations já aplicadas são imutáveis. Ela precisa, numa transação só: atualizar `roles` (name + slug, preservando `id`), inserir a role `vendas`, e recriar **todas** as policies que citam o slug antigo:

| Migration que criou a policy | Referências |
|---|---|
| `20260710180002_catalogo_produtos_midia_canais.sql` | 8 |
| `20260713140000_calendario_marketing_redes_sociais.sql` | 13 |
| `20260713150000_calendario_marketing_multi_canal.sql` | 3 |
| `20260711223431_ficha_de_fatiamento.sql` | 2 |
| `20260713120000_precificacao_produtos_compostos_e_b2b.sql` | 1 |

Uma policy esquecida não quebra o build nem o typecheck — ela silenciosamente nega acesso a quem tem a role. A verificação tem de ser feita consultando `pg_policies` por resíduo do slug antigo, não por leitura visual.

**Código.** Rota `src/app/(dashboard)/marketplace/` → `marketing/` (layout, `page.tsx`, `actions.ts`); `src/lib/navigation/area-routes.ts`; helpers `src/lib/auth/{marketing-calendar-access,catalog-access,inventory-access}.ts`; `src/app/(dashboard)/producao/estoque/layout.tsx`; seeds `scripts/seed-roles.ts` e `supabase/seed-hosted.sql`.

**Ambiente.** O Supabase de dev já foi semeado e migrado (ver guia de deploy). Um banco novo aplica migrations em ordem e converge no mesmo estado; o banco de dev existente converge pela migration nova. Ambos os caminhos precisam ser exercitados.

**camu-docs.** Sem dependência: nenhuma regra financeira, gatilho MEI/ME ou política de negócio muda. É rename de área do painel.
