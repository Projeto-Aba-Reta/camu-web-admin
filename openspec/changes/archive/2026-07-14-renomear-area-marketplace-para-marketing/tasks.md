## 1. Migration: renomear a role e reescrever as policies

A migration inteira é uma transação (design, decisão 2): o slug muda e as 19 policies são reescritas juntos, ou nada muda. Criar `supabase/migrations/<timestamp>_renomear_role_marketplace_vendas_para_marketing.sql`.

- [x] 1.1 `update public.roles set name = 'Marketing', slug = 'marketing' where slug = 'marketplace-vendas'` — **`update`, nunca `delete` + `insert`**: preservar o `id` é o que mantém as atribuições em `user_roles` vivas (design, decisão 1).
- [x] 1.2 Reescrever as policies de catálogo (`drop policy` + `create policy`, trocando `has_role('marketplace-vendas')` por `has_role('marketing')`, preservando o resto da expressão exatamente): `products_select`, `product_media_select`, `product_channel_listings_select`, `product_channel_listings_insert`, `product_channel_listings_update`.
- [x] 1.3 Reescrever as policies de ficha e composição: `product_slicing_sheets_select`, `product_slicing_sheet_materials_select`, `product_components_select`.
- [x] 1.4 Reescrever as policies do calendário: `commemorative_dates_marketing_{select,insert,update}`, `social_content_plan_items_{select,insert,update}`, `social_content_plan_status_events_{select,insert}`, `social_content_plan_item_channels_{select,insert,delete}`.
- [x] 1.5 `insert` da role de reserva `vendas` / "Vendas/Marketplace", sem policy e sem tela (proposal; spec `seed-de-dados-iniciais`).
- [x] 1.6 Conferir que as 19 policies do design (9 tabelas) foram todas cobertas por 1.2–1.4 — o número é a checagem, não a impressão de ter passado por todas.

## 2. Verificar a migration contra o banco (não contra os arquivos)

Uma policy esquecida não quebra build, typecheck nem teste — ela só nega acesso, calada. Só o catálogo do Postgres é fonte de verdade (design, decisão 4).

- [x] 2.1 Aplicar a migration no Supabase de dev.
- [x] 2.2 Rodar a query de resíduo e exigir **0 linhas**:
      ```sql
      select schemaname, tablename, policyname from pg_policies
      where qual::text like '%marketplace-vendas%'
         or with_check::text like '%marketplace-vendas%';
      ```
      Se retornar qualquer linha, voltar ao passo 1 — inclusive se a policy não aparecer em nenhuma migration (aí o banco divergiu dos arquivos, e isso vira decisão à parte, não conserto silencioso).
- [x] 2.3 Confirmar que as atribuições sobreviveram: o Sócio A continua com a role (agora `marketing`) em `user_roles` — prova de que 1.1 preservou o `id`.

## 3. Código: rota, navegação e helpers de acesso

- [x] 3.1 `git mv "src/app/(dashboard)/marketplace" "src/app/(dashboard)/marketing"` — o App Router deriva a URL do caminho, então mover o diretório *é* a mudança de rota (design, decisão 6). Renomear `MarketplaceLayout` para `MarketingLayout` e atualizar o comentário do guard, que hoje cita "domínio Marketplace/Vendas".
- [x] 3.2 `src/lib/navigation/area-routes.ts`: chave `"marketplace-vendas"` → `marketing`, `href` → `/marketing/calendario`. Atualizar o comentário acima da entrada (hoje diz "Marketplace/Vendas: o calendário de marketing é, por ora, a única tela da área"). **Não** adicionar entrada para `vendas` — é a ausência de rota que a torna não-clicável na sidebar.
- [x] 3.3 `src/lib/auth/marketing-calendar-access.ts`: `hasRole(user, "marketplace-vendas")` → `"marketing"`. Corrigir a mensagem de erro de `requireMarketingCalendarWrite`, que hoje diz "Apenas Owner, Sócio ou Vendas/Marketplace…" — agora é Marketing.
- [x] 3.4 `src/lib/auth/catalog-access.ts`: o slug em `canAccessCatalog` e `canManageChannelListings`, mais a mensagem de `requireChannelListingWrite` ("…ou Vendas/Marketplace podem alterar disponibilidade por canal" → Marketing) e os comentários que citam o slug antigo.
- [x] 3.5 `src/lib/auth/inventory-access.ts` e `src/app/(dashboard)/producao/estoque/layout.tsx`: mesmo tratamento (slug + comentários).
- [x] 3.6 Varrer o resto de `src/` por `marketplace-vendas` e por `/marketplace/` — deve sobrar zero. Cuidado para **não** trocar os usos legítimos de "marketplace" que descrevem canal de venda (`MarketplaceChannel`, `channel_fees`, tipos de precificação): esses seguem corretos e não são a role.

## 4. Seeds: estado final, com as roles já renomeadas

Seed roda contra banco vazio — descreve o estado desejado, não a transição (design, decisão 5).

- [x] 4.1 `scripts/seed-roles.ts`: em `ROLE_DEFS`, `{ name: "Marketplace/Vendas", slug: "marketplace-vendas" }` → `{ name: "Marketing", slug: "marketing" }`, e acrescentar `{ name: "Vendas/Marketplace", slug: "vendas" }`. Em `SOCIO_DEFS`, o `roleSlugs` do Sócio A passa a `["producao", "marketing"]`.
- [x] 4.2 `supabase/seed-hosted.sql`: mesma troca na lista de roles (hoje `('Marketplace/Vendas', 'marketplace-vendas', v_owner_id)`), incluindo a linha nova de `vendas`, e a atribuição do Sócio A. Manter o padrão de `created_by` já usado (ver Open Questions do design).
- [x] 4.3 Não tocar nos textos de `seed-governance.ts` / `seed-hosted.sql` que falam de "marketplace" como canal de venda no log de decisões — são conteúdo de negócio, não a role.

## 5. Verificação de ponta a ponta

A query do passo 2 prova a *ausência* do nome antigo. Nada até aqui prova a *presença* do acesso novo — só exercitar a tela prova.

- [x] 5.1 `supabase db reset` local: aplica as migrations do zero + seed. Confirma que o caminho banco-novo converge no mesmo estado do banco-de-dev, que é o único caminho testado até aqui.
- [x] 5.2 `npm run build` e typecheck — pega import quebrado pelo `git mv`, não pega policy errada.
- [x] 5.3 Login como `socio-a@camu.local`: a sidebar mostra **Marketing** (clicável, indo para `/marketing/calendario`) e **Vendas/Marketplace** (não-clicável). Abrir o calendário, **criar e editar** um item de planejamento — é isso que confirma que as policies de escrita reescritas em 1.4 de fato concedem.
- [x] 5.4 Confirmar que o catálogo em `/producao/catalogo` continua legível para quem tem só a role de Marketing — a policy `products_select` foi reescrita em 1.2 e é a mais fácil de quebrar sem perceber, porque a tela é de outra área.
- [x] 5.5 `/marketplace/calendario` agora dá 404. É o esperado (design: sem redirect); só confirmar que nenhum link interno ainda aponta para lá.

## 6. Fechamento

- [x] 6.1 `openspec validate renomear-area-marketplace-para-marketing --strict`.
- [x] 6.2 Atualizar o `README.md`, que cita "Marketplace/Vendas" na lista de áreas e nas credenciais de exemplo do Sócio A.
- [x] 6.3 Commit seguindo a convenção do repo, ex.: `Refactor(marketing): renomeia área Marketplace/Vendas para Marketing e reserva role vendas`.
