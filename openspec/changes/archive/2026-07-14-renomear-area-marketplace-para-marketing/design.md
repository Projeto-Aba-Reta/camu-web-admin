## Context

A área "Marketplace/Vendas" tem exatamente uma tela: o calendário de marketing de redes sociais, em `/marketplace/calendario`. O nome descreve um domínio que não existe. Renomear a área para **Marketing** e reservar **Vendas/Marketplace** como role vazia alinha o painel à realidade.

O que torna isso mais que um find-and-replace é `public.has_role`:

```sql
create function public.has_role(role_slug text) returns boolean
  ... select exists (select 1 from user_roles ur join roles r on ... where r.slug = role_slug)
```

A resolução é **por slug, em tempo de consulta**. As policies RLS não guardam referência ao `id` da role — elas literalizam a string `'marketplace-vendas'`. No instante em que `roles.slug` vira `marketing`, toda policy que ainda diz `has_role('marketplace-vendas')` passa a avaliar `false` para todo mundo. Não há erro, não há warning: o acesso simplesmente evapora.

O levantamento no código dá o tamanho exato do problema — **19 policies em 9 tabelas**, criadas por 5 migrations já aplicadas:

| Tabela | Policies com o slug |
|---|---|
| `products` | `products_select` |
| `product_media` | `product_media_select` |
| `product_channel_listings` | `_select`, `_insert`, `_update` |
| `product_components` | `product_components_select` |
| `product_slicing_sheets` | `product_slicing_sheets_select` |
| `product_slicing_sheet_materials` | `product_slicing_sheet_materials_select` |
| `commemorative_dates_marketing` | `_select`, `_insert`, `_update` |
| `social_content_plan_items` | `_select`, `_insert`, `_update` |
| `social_content_plan_status_events` | `_select`, `_insert` |
| `social_content_plan_item_channels` | `_select`, `_insert`, `_delete` |

O Supabase de dev já está migrado e semeado, então o banco existente precisa convergir por migration nova — as 5 migrations aplicadas são imutáveis.

## Goals / Non-Goals

**Goals:**
- Role `marketplace-vendas` → `marketing` ("Marketing"), preservando o `id` da linha e portanto as atribuições em `user_roles`.
- Rota `/marketplace/calendario` → `/marketing/calendario`.
- Role `vendas` ("Vendas/Marketplace") criada vazia, como reserva de nome.
- Nenhuma mudança de *quem pode o quê*. A matriz de permissões é idêntica antes e depois; só muda o nome da role que carrega cada direito.
- Convergência idêntica nos dois caminhos: banco novo (migrations em ordem) e banco de dev existente (migration nova por cima).

**Non-Goals:**
- Qualquer tela de vendas/marketplace. A role `vendas` nasce sem rota, sem policy e sem tabela.
- Reescrever as 5 migrations já aplicadas.
- Redirect `/marketplace/*` → `/marketing/*`. Não há links externos; o custo não se paga.

## Decisions

### 1. `update` na linha existente, não `delete` + `insert`

A role é renomeada com `update roles set name = 'Marketing', slug = 'marketing' where slug = 'marketplace-vendas'`, preservando o `id`.

*Por quê:* `user_roles.role_id` referencia `roles.id` com `on delete cascade`. Um `delete` + `insert` geraria um `id` novo e **apagaria silenciosamente as atribuições dos sócios** — o Sócio A perderia a área. O `update` mantém `user_roles` intacto: ninguém precisa ser reatribuído.

### 2. Slug e policies mudam na mesma migration, numa transação

A migration faz, em ordem, dentro de uma transação: (a) `update` do slug; (b) `drop policy` + `create policy` das 19 policies, agora com `has_role('marketing')`; (c) `insert` da role `vendas`.

*Por quê:* entre (a) e (b) o sistema fica com acesso negado para toda a área. Numa transação, essa janela nunca é observável por outra sessão. Migrations do Supabase CLI já rodam em transação por padrão — a decisão aqui é **não** fatiar isso em duas migrations, o que criaria um intervalo real de acesso quebrado entre elas.

*Alternativa descartada:* fazer as policies aceitarem os dois slugs (`has_role('marketing') or has_role('marketplace-vendas')`) para desacoplar as etapas. Rejeitado: é exatamente a compatibilidade retroativa que este change existe para não ter — deixaria o nome antigo vivo no schema indefinidamente, que é o problema original.

### 3. `drop policy` + `create policy`, não `alter policy`

*Por quê:* `alter policy ... using (...)` existe, mas exige repetir a expressão inteira e não cobre a troca de `with check` de forma uniforme entre `insert`/`update`. `drop` + `create` é o padrão já usado nas migrations do repositório, e deixa o texto final da policy explícito e auditável no arquivo.

### 4. A verificação é uma query, não uma leitura

Após aplicar, o critério de pronto é `pg_policies` não conter mais nenhum resíduo:

```sql
select schemaname, tablename, policyname
from pg_policies
where qual::text like '%marketplace-vendas%'
   or with_check::text like '%marketplace-vendas%';
-- deve retornar 0 linhas
```

*Por quê:* uma policy esquecida não quebra `tsc`, não quebra `next build`, não quebra teste nenhum — ela só nega acesso, em produção, para quem tem a role. Nenhuma ferramenta do stack pega isso. Só o catálogo do Postgres é fonte de verdade sobre o que está de fato instalado no banco, e o banco de dev pode ter policies que os arquivos não descrevem. Conferir por leitura dos `.sql` é confundir o que foi escrito com o que está rodando.

### 5. Seeds descrevem o estado final, migration descreve a transição

`scripts/seed-roles.ts` e `supabase/seed-hosted.sql` passam a semear `marketing` e `vendas` diretamente — eles não "renomeiam" nada, porque rodam contra banco vazio.

*Por quê:* seed é estado desejado, migration é delta. Um banco novo aplica as 5 migrations antigas (que criam policies com o slug antigo), depois a nova (que as reescreve), e o seed insere as roles já com os nomes novos — convergindo no mesmo lugar que o banco de dev. Os dois caminhos precisam ser exercitados de fato, porque só um deles passa pelo `update` da migration.

### 6. Rota renomeada por `git mv`, área importada por caminho

`src/app/(dashboard)/marketplace/` → `src/app/(dashboard)/marketing/`. O App Router deriva a URL do caminho do diretório, então mover o diretório é a mudança de rota — não há tabela de rotas a editar além de `areaRoutes`, cuja chave (`marketplace-vendas` → `marketing`) é o slug da role, não a URL.

O helper `marketing-calendar-access.ts` já se chama assim e já fala "marketing" — só o slug consultado muda. O nome do arquivo não precisa mudar.

## Risks / Trade-offs

- **[Uma policy escapa da reescrita e a área silenciosamente nega acesso]** → A query em `pg_policies` da Decisão 4 é obrigatória e roda contra o banco de dev *depois* de aplicar. Ela é o teste; a inspeção visual dos arquivos não é.

- **[O banco de dev diverge do que os arquivos de migration descrevem]** → Possível se alguém aplicou SQL manualmente. A mesma query em `pg_policies` detecta, porque pergunta ao banco em vez de aos arquivos. Se aparecer policy que nenhuma migration criou, isso vira decisão à parte — não se resolve em silêncio dentro deste change.

- **[Banco novo (from scratch) nunca é testado, e só o caminho do dev é exercitado]** → As tarefas exigem `supabase db reset` (aplica as 6 migrations + seed do zero) **além** de aplicar no dev. É o único jeito de pegar erro de ordenação entre migration e seed.

- **[Bookmark interno em `/marketplace/calendario` passa a dar 404]** → Aceito. São 3 sócios, sem link público, e a alternativa (manter um redirect) preserva justamente o nome que este change existe para matar.

- **[`vendas` nasce sem policy — se alguém a atribuir esperando acesso, não ganha nada]** → É o comportamento correto e já especificado: `navegacao-por-area` renderiza item sem rota como não-clicável. O risco real seria o inverso (uma role vazia que concede acesso a algo).

## Migration Plan

1. Migration nova, transação única: `update` do slug → `drop`/`create` das 19 policies → `insert` da role `vendas`.
2. Aplicar no dev; rodar a query de resíduo em `pg_policies` (0 linhas).
3. `supabase db reset` local, confirmando que o caminho from-scratch converge no mesmo estado.
4. Login como `socio-a@camu.local` (que tem a role) e exercitar o calendário em `/marketing/calendario`: ler, criar e editar um item. É a verificação de que as policies de fato concedem — a query de resíduo prova ausência do nome antigo, não presença do acesso novo.

**Rollback:** migration inversa simétrica (slug de volta, policies reescritas com o slug antigo, `delete` da role `vendas`). Como `roles.id` é preservado no `update`, o rollback também não toca `user_roles`. Nenhum dado de usuário é destruído em nenhuma direção, o que torna o rollback barato — o custo real de errar aqui é janela de acesso negado, não perda de dado.

## Open Questions

- O head da role `vendas`: `seed-hosted.sql` grava um `created_by` (hoje o owner). A role de reserva segue esse padrão — é o que as tarefas assumem. Se a intenção for deixá-la sem dono até existir alguém de Vendas, é um ajuste de uma linha no seed.
