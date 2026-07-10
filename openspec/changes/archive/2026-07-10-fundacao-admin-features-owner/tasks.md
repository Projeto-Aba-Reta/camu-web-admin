## 1. Fix: navegação da sidebar para Administração

- [x] 1.1 ~~Estender `SidebarItem`/`SidebarSection` em `build-sidebar.ts` para suportar subitens (`children`)~~ Substituído: seção "admin" agora usa lista plana de `SidebarItem`, mesmo formato da seção "areas" (ver design.md, decisão 1)
- [x] 1.2 Substituir `ADMIN_ITEM` por `ADMIN_ITEMS` em `build-sidebar.ts`: Painel (`/admin`), Usuários (`/admin/usuarios`), Roles (`/admin/roles`), Auditoria (`/admin/auditoria`), Configurações (`/admin/configuracoes`), Convites & Sessões (`/admin/convites-sessoes`)
- [x] 1.3 ~~Atualizar `SidebarNavItem`/`Sidebar` para renderizar grupo expansível~~ Não necessário: itens planos já usam a renderização existente; adicionados ícones novos (`layout-dashboard`, `users`, `shield`, `file-text`, `mail`) ao `ICON_MAP`
- [x] 1.4 Testado (via requisição HTTP autenticada com sessão real de Owner, sem interação de navegador disponível neste ambiente — ver nota de verificação no final do arquivo): os 6 links de Administração aparecem no HTML como `<a href="...">` reais (antes: `<div>` sem `href`), apontando para as 6 rotas corretas

## 2. Backend/dados: auditoria e configurações

- [x] 2.1 Criar migration com tabelas `audit_log` (`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata jsonb`, `created_at`) e `system_settings` (`key` PK, `value jsonb`, `updated_by`, `updated_at`), com RLS restringindo leitura/escrita a `user_type = 'owner'`; inclui também a função `revoke_user_sessions` (ver task 3.1)
- [x] 2.2 Criar `IAuditLogRepository`/`SupabaseAuditLogRepository` com `record()` e `listRecent()`
- [x] 2.3 Criar `AuditLogService` com método `record(actorId, action, entityType, entityId, metadata)`
- [x] 2.4 Criar `ISystemSettingsRepository`/`SupabaseSystemSettingsRepository` e `SystemSettingsService` (`listAll`, `get`, `upsert`)
- [x] 2.5 Instrumentar `role-service.ts` para chamar `AuditLogService.record(...)` em criação/edição/exclusão de role e sub-role
- [x] 2.6 Instrumentar `user-service.ts` para chamar `AuditLogService.record(...)` em convite, mudança de `user_type` e atribuição/remoção de role/sub-role
- [x] 2.7 Instrumentar `SystemSettingsService.upsert` para chamar `AuditLogService.record(...)` a cada alteração

## 3. Backend/dados: convites e sessões

- [x] 3.1 Criar `IInviteSessionRepository`/`SupabaseInviteSessionRepository` com `resendInvite`, `cancelInvite` (via `supabase.auth.admin.*`) e `revokeSessions`. **Desvio do design original**: não existe método no `supabase-js` instalado (auth-js 2.x) para revogar sessões de um usuário por `id` — só `admin.signOut(jwt)`, que exige o token da própria sessão (confirmado testando `DELETE /admin/users/{id}/sessions` no GoTrue local: 404). `revokeSessions` chama a função `security definer` `public.revoke_user_sessions(p_user_id)` (criada na migration da task 2.1), que apaga as linhas do usuário em `auth.sessions` — cascata em `auth.refresh_tokens` força novo login na próxima renovação de token. Ver design.md, decisão 4 (atualizada). Listagem de convites pendentes não precisou de método próprio: deriva de `userService.listUsersWithRoles()` filtrando `status = 'invited'` na UI (task 7.1)
- [x] 3.2 Criar `InviteSessionService` chamando o repositório acima e registrando auditoria em cada ação (reenvio, cancelamento, revogação)

## 4. UI: painel administrativo (`/admin`)

- [x] 4.1 Criar `src/app/(dashboard)/admin/page.tsx`: landing com contagem de usuários por `user_type`, total de roles e total de convites pendentes
- [x] 4.2 Adicionar cards de atalho para Usuários, Roles, Auditoria, Configurações e Convites & Sessões

## 5. UI: log de auditoria

- [x] 5.1 Criar `src/app/(dashboard)/admin/auditoria/page.tsx`: listagem paginada com TanStack Table (autor, ação, entidade, data/hora), ordenada por mais recente primeiro
- [x] 5.2 Restringir a rota a `user_type = 'owner'` (herdado do guard de `admin/layout.tsx`)

## 6. UI: configurações do sistema

- [x] 6.1 Criar `src/app/(dashboard)/admin/configuracoes/page.tsx`: listagem dos parâmetros cadastrados com valor atual e última alteração
- [x] 6.2 Criar `src/components/admin/system-setting-form.tsx` (dialog) para editar o valor de um parâmetro
- [x] 6.3 Definir e popular (via migration, idempotente) o conjunto inicial de parâmetros: `fundacao.nome`, `financeiro.teto_mei_anual_centavos` (valor em centavos para evitar ponto flutuante), `contato.padrao`

## 7. UI: gestão de convites e sessões

- [x] 7.1 Criar `src/app/(dashboard)/admin/convites-sessoes/page.tsx`: listagem de usuários com convite pendente e ações de reenviar/cancelar
- [x] 7.2 Criar `src/components/admin/revoke-sessions-dialog.tsx` para revogar sessões ativas de um usuário a partir da tela de usuários existente
- [x] 7.3 Restringir as rotas `admin/convites-sessoes/**` a `user_type = 'owner'`
- [x] 7.4 **Fix adicional descoberto ao testar o aceite de convite ponta a ponta**: o link real do e-mail de convite (`.../auth/v1/verify?token=...&type=invite&redirect_to=...`) não apontava para `/auth/callback` (fluxo PKCE); o GoTrue redireciona com os tokens no fragmento da URL (`#access_token=...`), que o servidor nunca vê — o usuário convidado não era autenticado e não existia nenhuma tela para definir senha. Corrigido com:
  - `supabase/templates/invite.html` customizado, com link para `/auth/confirm?token_hash=...&type=invite&next=/set-password` (padrão recomendado pelo Supabase para SSR, evita fragmento de URL)
  - `src/app/auth/confirm/route.ts`: valida `token_hash` via `verifyOtp` (autenticação 100% server-side)
  - `src/app/(public)/set-password/**`: página + Server Action para o usuário definir a senha (`supabase.auth.updateUser({ password })`)
  - Guard em `src/app/(dashboard)/layout.tsx`: se `status === 'invited'`, força redirecionamento para `/set-password`
  - **Bug relacionado, também descoberto e corrigido**: `request.url`/`request.nextUrl.href` nas Route Handlers deste projeto (Next 16.2.10 + Turbopack, modo dev) sempre normalizam o host para `localhost:<porta>`, mesmo quando o cliente acessa por `127.0.0.1` — quebrando o cookie de sessão (host-only, sem `Domain=`) recém-criado no redirect seguinte. Corrigido com `src/lib/auth/resolve-request-origin.ts`, que usa o header `Host`/`X-Forwarded-Host` (confirmado correto) em vez de `request.url`/`nextUrl`; aplicado em `/auth/confirm` e também em `/auth/callback` (mesmo padrão pré-existente, mesmo bug latente)

## 8. Verificação

Sem navegador disponível neste ambiente de execução; verificação feita via HTTP com sessões reais autenticadas (login real contra o Supabase local por `signInWithPassword`, cookies de sessão reais anexados às requisições) e via chamadas diretas às camadas de serviço reais (as mesmas usadas pelas Server Actions), não apenas testes unitários.

- [x] 8.1 Confirmado: com sessão de Owner, os 6 links de Administração aparecem como `<a href>` reais no HTML de `/` e cada rota (`/admin`, `/admin/usuarios`, `/admin/roles`, `/admin/auditoria`, `/admin/configuracoes`, `/admin/convites-sessoes`) responde 200
- [x] 8.2 Confirmado ponta a ponta contra o banco local: `npm run seed-roles` gerou entradas `role.create` e `user.assign_role` reais em `audit_log`; testes diretos de `SystemSettingsService.updateSetting`, `InviteSessionService.revokeSessions` (com verificação de que `auth.sessions` do usuário zera) e do fluxo convidar/reenviar/cancelar geraram os registros `system_setting.update`, `session.revoke`, `invite.resend`/`invite.cancel` correspondentes, todos visíveis em `/admin/auditoria` com o autor "Owner"
- [x] 8.3 Confirmado: com sessão de Sócio (`socio-a@camu.local`), `/admin`, `/admin/usuarios`, `/admin/roles`, `/admin/auditoria`, `/admin/configuracoes` e `/admin/convites-sessoes` retornam 307 para `/`, e nenhum link `/admin/**` aparece no HTML da sidebar
- [x] 8.4 Confirmado: painel `/admin` refletiu corretamente "1" em Convites pendentes após um convite de teste, voltando a 0 após o cancelamento
- [x] 8.5 Confirmado ponta a ponta o aceite de convite completo: convite real via `inviteUserByEmail` → e-mail capturado no Mailpit local com o link customizado apontando para a porta correta do frontend → `/auth/confirm` autentica via `verifyOtp` e preserva o host (`127.0.0.1`) no redirect → `/set-password` renderiza autenticado → `supabase.auth.updateUser({ password })` conclui → login subsequente com a nova senha funciona

**Bug adicional descoberto e corrigido durante a verificação** (fora do escopo original desta change, mas bloqueava a task 7 de ter qualquer dado real): `profiles.status` nunca era gravado como `'invited'` — o trigger `handle_new_user()` (de `fundacao-schema-auth`) sempre usava o default da coluna (`'active'`), então nenhum usuário jamais aparecia como convite pendente. Corrigido na migration `20260710171500_fundacao_fix_invited_status.sql`, que reescreve `handle_new_user()` para checar `invited_at`/`email_confirmed_at` de `auth.users` e adiciona uma trigger `AFTER UPDATE` (`handle_user_invite_accepted`) para os casos em que o GoTrue popula `invited_at` numa segunda instrução, e para reativar o perfil quando o convite é aceito. Testado com um convite real de ponta a ponta (status virou `invited`, depois removido via cancelamento).
