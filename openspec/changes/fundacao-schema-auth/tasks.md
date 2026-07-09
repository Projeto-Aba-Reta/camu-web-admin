## 1. Scaffold do projeto (backend/dados + tooling)

- [ ] 1.1 Inicializar projeto Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, seguindo as convenções do `camu-web-landing-page` (sem `tailwind.config.js`, path alias `@/*`, ESLint)
- [ ] 1.2 Adicionar dependências `@supabase/supabase-js` e `@supabase/ssr`
- [ ] 1.3 Inicializar Supabase CLI no repositório (`supabase init`) e configurar `supabase/config.toml`
- [ ] 1.4 Criar `.env.example` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 1.5 Garantir `.env*` (exceto `.env.example`) no `.gitignore`
- [ ] 1.6 Adicionar scripts no `package.json`: `supabase:start`, `supabase:stop`, `supabase:reset`, `db:types`, `db:migration:new`

## 2. Schema de dados e RLS (backend/dados)

- [ ] 2.1 Migration: criar tabela `profiles` (`id`, `email`, `full_name`, `user_type`, `status`, timestamps) com FK para `auth.users`
- [ ] 2.2 Migration: trigger `on_auth_user_created` (cria `profiles` ao criar `auth.users`) e `on_auth_user_updated` (sincroniza `email`)
- [ ] 2.3 Migration: criar tabelas `roles` e `sub_roles` (sem seed) com `slug` único (`sub_roles.slug` único por `role_id`)
- [ ] 2.4 Migration: criar tabelas `user_roles` e `user_sub_roles` (PKs compostas, `granted_by`, `granted_at`)
- [ ] 2.5 Migration: trigger em `user_sub_roles` que garante (upsert) o `user_roles` correspondente à role pai da sub-role
- [ ] 2.6 Migration: habilitar RLS em `profiles`, `roles`, `sub_roles`, `user_roles`, `user_sub_roles`
- [ ] 2.7 Migration: criar funções `SECURITY DEFINER STABLE`: `is_owner()`, `is_socio_or_owner()`, `has_role(slug)`, `has_sub_role(slug)`
- [ ] 2.8 Migration: policies de RLS usando as funções acima (leitura para o próprio usuário + bypass total para Owner/Sócio; escrita restrita a Owner)
- [ ] 2.9 Gerar tipos TypeScript do schema (`npm run db:types`) e versionar `src/lib/supabase/database.types.ts`

## 3. Camada de repositórios e services (backend/dados)

- [ ] 3.1 Definir interfaces em `src/lib/repositories/interfaces/`: `role-repository.interface.ts`, `sub-role-repository.interface.ts`, `user-repository.interface.ts`
- [ ] 3.2 Implementar `src/lib/repositories/supabase/supabase-role-repository.ts` e `supabase-sub-role-repository.ts`
- [ ] 3.3 Implementar `src/lib/repositories/supabase/supabase-user-repository.ts` (perfil, listagem, convite via `service_role`)
- [ ] 3.4 Criar composition root `src/lib/repositories/index.ts` (`createRepositories(supabaseClient)`)
- [ ] 3.5 Criar `src/lib/services/role-service.ts` e `src/lib/services/user-service.ts` com a regra de negócio (ex.: implicação sub-role→role) por cima dos repositórios

## 4. Clients Supabase e sessão (backend/dados)

- [ ] 4.1 Criar `src/lib/supabase/client.ts` (browser client)
- [ ] 4.2 Criar `src/lib/supabase/server.ts` (server client via cookies do `next/headers`)
- [ ] 4.3 Criar `src/lib/supabase/middleware.ts` (`updateSession()`) e `src/middleware.ts` consumindo-a
- [ ] 4.4 Criar client `service_role` isolado (marcado `import "server-only"`), usado só pelo `user-repository`
- [ ] 4.5 Criar `src/lib/auth/get-current-profile.ts` retornando `CurrentUser` tipado (id, email, userType, roles, subRoles)
- [ ] 4.6 Criar `src/types/auth.ts` com os tipos `CurrentUser`, `Role`, `SubRole`, `UserType`

## 5. Telas e fluxo de login (UI)

- [ ] 5.1 Criar rota pública `src/app/(public)/login/page.tsx` com formulário de e-mail/senha
- [ ] 5.2 Criar `src/components/auth/login-form.tsx` (Client Component, chama Supabase Auth via Server Action)
- [ ] 5.3 Criar `src/app/auth/callback/route.ts` (troca de code por sessão, usado no fluxo de convite)
- [ ] 5.4 Criar `src/app/auth/sign-out/route.ts` (encerra sessão e redireciona para `/login`)
- [ ] 5.5 Criar `src/app/(dashboard)/layout.tsx`: busca `get-current-profile`, redireciona para `/login` se não houver sessão, renderiza um shell mínimo (sem sidebar completa — isso é escopo de `fundacao-sidebar-e-shell`)
- [ ] 5.6 Criar `src/app/(dashboard)/page.tsx` como página inicial placeholder pós-login

## 6. Documentação e verificação

- [ ] 6.1 Atualizar `README.md` com pré-requisitos (Docker Desktop, Node, Supabase CLI) e passo a passo: `npm install` → `cp .env.example .env.local` → `npm run supabase:start` → copiar chaves para `.env.local` → `npm run supabase:reset` → `npm run dev`
- [ ] 6.2 Documentar no README como promover manualmente o primeiro usuário Owner (`update profiles set user_type = 'owner'`)
- [ ] 6.3 Verificar end-to-end: subir `supabase start`, aplicar migrations, criar usuário via Studio local, promovê-lo a Owner, fazer login pela UI e confirmar redirecionamento para o dashboard
- [ ] 6.4 Verificar que acessar qualquer rota do dashboard sem sessão redireciona para `/login` (manual, via navegador anônimo)
