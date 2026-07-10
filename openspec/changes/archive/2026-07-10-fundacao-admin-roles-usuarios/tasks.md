## 1. Regras de negócio adicionais (backend/dados)

- [x] 1.1 Estender `role-service.ts` (de `fundacao-schema-auth`) com `deleteRole` (cascata) e validação de `slug` único na criação/edição
- [x] 1.2 Estender `user-service.ts` com `changeUserType`, incluindo a regra de não permitir remover o último Owner (checagem em RPC/transação no Postgres)
- [x] 1.3 Adicionar migration com função/RPC `count_owners()` ou constraint equivalente usada pela regra de 1.2
- [x] 1.4 Estender `IRoleRepository`/`IUserRepository` (interfaces) e as implementações Supabase com os métodos necessários para 1.1–1.2

## 2. Telas de gestão de roles (UI)

- [x] 2.1 Criar `src/app/(dashboard)/admin/roles/page.tsx`: listagem de roles com TanStack Table (busca, contagem de sub-roles/usuários)
- [x] 2.2 Criar `src/components/admin/role-form.tsx` (dialog/sheet shadcn) para criar/editar role
- [x] 2.3 Criar `src/app/(dashboard)/admin/roles/[roleId]/page.tsx`: detalhe da role com CRUD de sub-roles (`src/components/admin/sub-role-form.tsx`)
- [x] 2.4 Implementar confirmação de exclusão de role (dialog) avisando sobre cascata de sub-roles/usuários afetados
- [x] 2.5 Restringir as rotas `admin/roles/**` a `user_type = 'owner'` (guard no layout/página)

## 3. Telas de gestão de usuários (UI)

- [x] 3.1 Criar `src/app/(dashboard)/admin/usuarios/page.tsx`: listagem de usuários com `user_type`, status e roles atribuídas
- [x] 3.2 Criar formulário de convite de usuário (e-mail) chamando `inviteUser` do `user-service`
- [x] 3.3 Criar `src/app/(dashboard)/admin/usuarios/[userId]/page.tsx`: detalhe do usuário com `src/components/admin/user-role-assign.tsx` (atribuir/remover roles e sub-roles, exibindo sub-roles aninhadas sob a role)
- [x] 3.4 Implementar controle de alteração de `user_type` com dialog de confirmação explícita
- [x] 3.5 Exibir erro de UI quando a tentativa de rebaixar o último Owner for rejeitada pelo backend
- [x] 3.6 Restringir as rotas `admin/usuarios/**` a `user_type = 'owner'` (guard no layout/página)

## 4. Script de seed (backend/dados)

- [x] 4.1 Criar `scripts/seed-roles.ts`, chamando os services/repositórios existentes (não SQL solto) com o client `service_role`
- [x] 4.2 Implementar upsert idempotente por `slug` para as 7 roles (Produção, Marketplace/Vendas, Site, Assinatura, Infra/Automação, Financeiro, Societário)
- [x] 4.3 Implementar criação/upsert dos 3 usuários de exemplo (`socio-a@camu.local`, `socio-b@camu.local`, `socio-c@camu.local`) via `auth.admin`, com `user_type = 'socio'`
- [x] 4.4 Implementar atribuição das roles conforme a tabela do `camu-docs` (Sócio A → Produção + Marketplace/Vendas; Sócio B → Site + Assinatura + Infra/Automação; Sócio C sem role própria)
- [x] 4.5 Adicionar log final explícito avisando que a divisão aplicada é provisória
- [x] 4.6 Adicionar script `seed-roles` no `package.json` e documentar no README (uso recomendado só em ambiente local)

## 5. Verificação

- [x] 5.1 Rodar `npm run seed-roles` duas vezes seguidas em um banco local e confirmar ausência de duplicatas
- [x] 5.2 Testar manualmente, como Owner: criar role, criar sub-role, editar, excluir role com usuário associado e confirmar que o usuário deixa de ver a área na sidebar
- [x] 5.3 Testar manualmente, como Owner: convidar usuário, atribuir sub-role sem a role pai e confirmar que a role pai é concedida automaticamente
- [x] 5.4 Testar manualmente: tentar rebaixar o único Owner do sistema e confirmar que a ação é rejeitada
- [x] 5.5 Testar manualmente, como Sócio: confirmar que as rotas `admin/roles` e `admin/usuarios` não são acessíveis
