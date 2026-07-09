## Context

O repositório está 100% greenfield (só `README.md` e `openspec/config.yaml`). O repositório irmão `camu-web-landing-page` já define o precedente de stack da empresa (Next.js 16 App Router, React 19, TypeScript, Tailwind v4, sem `tailwind.config.js`, tema via `@theme inline` em `globals.css`) e usa o mesmo fluxo OpenSpec — vale seguir essas convenções para consistência entre repositórios da Camu.

A divisão de responsabilidades entre os 3 sócios (`camu-docs/01-visao-geral/sociedade-e-divisao.md`) é explicitamente marcada como provisória, e um dos 3 sócios não tem área operacional documentada. Por isso o modelo de acesso não pode hardcodar áreas de negócio no código — precisa ser um catálogo dinâmico (`roles`/`sub_roles`) que o Owner cadastra e reatribui livremente.

## Goals / Non-Goals

**Goals:**
- Modelo de dados de identidade e acesso (Owner / Sócio / Member + Roles/Sub-roles dinâmicas) pronto para ser consumido por RLS em todas as fases futuras.
- Login funcional com sessão persistida, protegendo todo o dashboard.
- Ambiente local reprodutível via Docker sem exigir acesso a um projeto Supabase hospedado para desenvolver.
- Camada de acesso a dados desacoplada do Supabase via interfaces, para reduzir o custo de uma futura troca de provedor.

**Non-Goals:**
- Telas de gestão de roles/usuários (CRUD de roles/sub-roles, convite de usuário) — ficam em `fundacao-admin-roles-usuarios`.
- Sidebar dinâmica e toggle "ver todas as áreas" do Sócio — ficam em `fundacao-sidebar-e-shell`.
- Seed de dados de exemplo a partir do `camu-docs` — fica em `fundacao-admin-roles-usuarios`.
- Qualquer tela de domínio de negócio (financeiro, produção, vendas, assinatura, societário).
- Cadastro público de usuários (self-signup) — só convite pelo Owner.
- Auth Hook customizado para custom claims no JWT (otimização de RLS) — registrado como nota para o futuro, não implementado aqui.

## Decisions

### 1. Supabase em todos os ambientes, chaveado só por variáveis de ambiente
Local: `supabase start` (CLI oficial, stack Docker com Postgres + GoTrue Auth + Studio). Outros ambientes: projeto Supabase hospedado. O código sempre usa o client Supabase (mesmas queries, RLS, Supabase Auth) — só `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` mudam por ambiente. **Alternativa considerada e descartada**: Postgres puro via `docker-compose` local + connection string apontando pro Postgres do Supabase em produção, com auth própria (NextAuth/Lucia). Rejeitada porque duplicaria a lógica de auth/sessão e abriria mão de RLS nativo e de Auth pronto, sem ganho real já que Supabase local *já* roda em Docker.

### 2. Owner/Sócio como `profiles.user_type`, não como linhas em `roles`
`roles` representa áreas de negócio dinâmicas (Pricing, Marketing, Financeiro...); Owner/Sócio são níveis de autorização de plataforma (bypass técnico total), conceito estruturalmente diferente. Um campo dedicado (`user_type in ('owner','socio','member')`) simplifica RLS (`user_type in ('owner','socio')` = bypass) e evita poluir o catálogo de áreas com algo que não é uma área. **Alternativa considerada**: modelar Owner/Sócio como roles especiais na mesma tabela `roles`, com uma flag `is_system_role`. Rejeitada por misturar dois conceitos (nível de autorização vs. área de negócio) na mesma tabela e complicar as queries de RLS.

### 3. Tabelas: `profiles`, `roles`, `sub_roles`, `user_roles`, `user_sub_roles`
- `profiles` (1:1 com `auth.users`, populada por trigger `on_auth_user_created`): `id uuid PK references auth.users(id)`, `email`, `full_name`, `user_type text default 'member'`, `status text default 'active'` (`active`/`invited`/`disabled`), timestamps.
- `roles`: `id uuid PK`, `name`, `slug unique`, `description`, `icon`, `created_by references profiles(id)`, timestamps. Sem seed neste change.
- `sub_roles`: `id uuid PK`, `role_id references roles(id) on delete cascade`, `name`, `slug`, `description`, timestamps, `unique(role_id, slug)`.
- `user_roles` (`user_id`, `role_id`, `granted_by`, `granted_at`, PK composta) e `user_sub_roles` (`user_id`, `sub_role_id`, `granted_by`, `granted_at`, PK composta).
- Trigger em `user_sub_roles` garante (upsert) a linha correspondente em `user_roles` a partir de `sub_roles.role_id` — atribuir uma sub-role sempre implica a role pai, evitando inconsistência.

### 4. Funções `SECURITY DEFINER` como contrato para RLS das fases futuras
`is_owner()`, `is_socio_or_owner()`, `has_role(slug)`, `has_sub_role(slug)` — `STABLE`, evitam recursão de RLS ao consultar as próprias tabelas de permissão. As fases de domínio (financeiro, produção...) vão compor policies como `USING (public.is_socio_or_owner() OR public.has_role('financeiro'))` sem precisar reimplementar a lógica de checagem. **Decisão explícita**: Sócio tem bypass total de RLS sempre, independentemente de qualquer estado de UI — o filtro por área do Sócio (feito em `fundacao-sidebar-e-shell`) é só visual, nunca uma fronteira de segurança de dados.

### 5. Camada de repositórios com interfaces (repository pattern)
`src/lib/repositories/interfaces/` define contratos TypeScript sem referência a Supabase (`IRoleRepository`, `IUserRepository`, ...). `src/lib/repositories/supabase/` implementa esses contratos recebendo o client Supabase via parâmetro/construtor — nenhuma implementação lê `cookies()`/`headers()` diretamente. `src/lib/repositories/index.ts` é a composition root (`createRepositories(supabaseClient)`), único ponto que mudaria para trocar de provedor. `src/lib/services/` contém regra de negócio por cima dos repositórios (ex.: garantir role pai ao atribuir sub-role) e é o que Server Actions/Route Handlers consomem — nunca o client Supabase diretamente. **Trade-off aceito**: mais arquivos/indireção do que chamar o Supabase direto nas actions, mas o pedido explícito é reduzir o custo de uma futura migração de banco/provedor.

### 6. Autenticação por e-mail/senha via `@supabase/supabase-js` + `@supabase/ssr`
Clients em `src/lib/supabase/{client,server,middleware}.ts` (browser, Server Components/Actions via cookies, e refresh de sessão no middleware) + um client `service_role` isolado (`import "server-only"`) só para operações administrativas (convite de usuário). `src/middleware.ts` roda em todas as rotas exceto assets estáticos: sem sessão → redireciona para `/login`; sessão válida em `/login` → redireciona pro dashboard. Isso é proteção de UX; a segurança de dados real é sempre RLS no Postgres — por isso o layout do dashboard também busca a sessão de novo no server (defesa em profundidade). **Alternativa considerada**: magic link ou OAuth social. Adiado — poucos usuários (sócios + funcionários), e-mail/senha é suficiente e mais simples de administrar via convite.

### 7. Estrutura de pastas
```
src/
  app/
    (public)/login/page.tsx
    auth/callback/route.ts
    auth/sign-out/route.ts
    (dashboard)/layout.tsx        # busca profile+roles uma vez, monta shell
  lib/
    supabase/{client,server,middleware}.ts
    repositories/{interfaces,supabase}/
    services/
  middleware.ts
supabase/
  config.toml
  migrations/<timestamp>_fundacao_roles_subroles.sql
```
Sem `tailwind.config.js` (tema via `@theme inline`), path alias `@/*` — mesmo padrão do `camu-web-landing-page`.

### 8. Ambientes e segredos
`.env.example` commitado com as 3 chaves Supabase; `.env.local` git-ignorado. Scripts npm: `supabase:start`, `supabase:stop`, `supabase:reset` (aplica migrations), `db:types` (`supabase gen types typescript --local`), `db:migration:new`. Toda mudança de schema via `supabase/migrations/*.sql` — nunca editar schema manualmente via Studio em produção.

## Risks / Trade-offs

- **[Risco]** RLS baseado em funções `SECURITY DEFINER` com round-trip ao Postgres em cada policy pode custar performance conforme o volume de dados cresce nas fases futuras. → **Mitigação**: registrar como débito técnico conhecido; migrar para custom claims no JWT via Supabase Auth Hook é uma otimização futura, não bloqueia a fundação.
- **[Risco]** Camada de repositórios/interfaces adiciona indireção logo na primeira fase, antes de qualquer necessidade real de trocar de provedor. → **Mitigação**: foi um requisito explícito do usuário (facilitar troca futura de banco); manter as interfaces enxutas (só os métodos realmente usados na Fase 1) para não overengineer prematuramente.
- **[Risco]** `supabase start` exige Docker Desktop rodando; onboarding de um novo dev trava se isso não estiver claro. → **Mitigação**: README com pré-requisitos explícitos (Docker Desktop, Supabase CLI, Node) como parte das tasks deste change.
- **[Risco]** Sócio com bypass total de RLS significa que qualquer bug na sidebar (fase seguinte) não é uma falha de segurança, mas pode ser confuso para o usuário achar que "não tem acesso" quando na verdade só não está sendo mostrado. → **Mitigação**: decisão documentada aqui e repassada para `fundacao-sidebar-e-shell`, que deve tratar isso como filtro de exibição, não de dado.

## Migration Plan

1. `supabase/migrations/<timestamp>_fundacao_roles_subroles.sql`: cria tabelas, RLS, funções `SECURITY DEFINER`, trigger `on_auth_user_created`/`on_auth_user_updated` e trigger de implicação sub-role→role.
2. Aplicar local via `supabase db reset` (roda todas as migrations do zero) durante o desenvolvimento.
3. Primeiro Owner: criado manualmente (Studio local ou SQL direto) e promovido via `update profiles set user_type = 'owner' where email = '<email>'` — documentado no README, sem UI própria neste change.
4. Em ambientes hospedados, aplicar a mesma migration via `supabase db push` (ou pipeline equivalente) antes do deploy da aplicação.
5. Rollback: como é a primeira migration do projeto (schema novo, sem dados de produção existentes), rollback é `supabase db reset` local ou `drop` das tabelas criadas em caso de erro em ambiente hospedado — não há dado legado a preservar neste change.

## Open Questions

- Custom claims no JWT (via Supabase Auth Hook) para reduzir round-trips de RLS: vale revisitar quando o número de tabelas com policy crescer nas fases de domínio — não decidido aqui.
- Política de expiração/rotação de sessão (tempo de vida do refresh token) fica no padrão do Supabase Auth por ora; revisitar se surgir requisito de segurança mais específico da Camu.
