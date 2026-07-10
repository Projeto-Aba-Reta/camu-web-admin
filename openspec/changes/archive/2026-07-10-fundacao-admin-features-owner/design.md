## Context

A área `admin/**` (`src/app/(dashboard)/admin/`) já existe com guard de layout
(`admin/layout.tsx` → redireciona não-Owners) e com `requireOwner()` para
proteger Server Actions chamadas fora do layout. O padrão de repositório/
serviço já estabelecido em `role-service.ts`/`user-service.ts` (interfaces em
`lib/repositories/interfaces/`, implementação Supabase em
`lib/repositories/supabase/`) é o que esta change deve seguir para as novas
capacidades.

O bug de navegação está isolado em duas peças pequenas:
`src/lib/navigation/build-sidebar.ts` (o `ADMIN_ITEM` é montado com
`href: undefined`) e `src/components/layout/sidebar-nav-item.tsx` (que já
sabe renderizar um item sem `href` como não clicável — comportamento correto
para roles sem rota, mas errado aplicado à seção de Administração, que
sempre tem rota).

## Goals / Non-Goals

**Goals:**
- Corrigir a navegação: Owner consegue chegar a todas as subseções de
  Administração clicando na sidebar.
- Adicionar log de auditoria cobrindo as ações administrativas já existentes
  (roles/sub-roles/usuários) e as novas (configurações, convites, sessões).
- Adicionar uma tela de configurações do sistema com parâmetros simples
  chave/valor, versionável via auditoria.
- Adicionar uma tela de convites/sessões que reaproveite a Admin API do
  Supabase Auth já usada em `inviteUser`.
- Adicionar um painel (`/admin`) que sirva de landing e mostre métricas
  simples derivadas dos dados já existentes.

**Non-Goals:**
- Não implementar regras de negócio financeiro (cálculo de teto MEI,
  fechamento mensal etc.) — apenas armazenar parâmetros usados por esses
  domínios quando existirem.
- Não implementar exportação/retenção configurável do log de auditoria
  (fica só leitura, paginada, sem exportação nesta fase).
- Não expandir o modelo de permissões (roles/sub-roles) além do que já existe.

## Decisions

### 1. Sidebar: seção "Administração" com múltiplos itens, não um único item
Em vez de um item único `ADMIN_ITEM` sem `href`, `build-sidebar.ts` passa a
popular a seção "admin" com uma lista plana de itens (Painel, Usuários,
Roles, Auditoria, Configurações, Convites & Sessões), cada um com `href`
próprio — exatamente o mesmo formato já usado pela seção "areas" (título +
lista de `SidebarItem`). Nenhuma mudança de tipo ou de `SidebarNavItem`/
`Sidebar` foi necessária. Alternativa descartada: introduzir um nível de
"subitens" (`children`) com grupo expansível — rejeitada por adicionar um
padrão de UI novo (accordion) só para 6 itens, quando a lista plana já
resolve o requisito de navegabilidade sem repetir a seção "Áreas" (o título
"Administração" já deixa claro que os itens abaixo são dessa seção).

### 2. Log de auditoria: tabela única `audit_log`, escrita nos services existentes
Uma tabela `audit_log (id, actor_id, action, entity_type, entity_id, metadata jsonb, created_at)`
alimentada por chamadas explícitas dentro dos services (`role-service.ts`,
`user-service.ts`, novo `system-settings-service.ts`,
`invite-session-service.ts`) — não via trigger de banco. Alternativa
descartada: triggers Postgres em cada tabela — rejeitada porque a auditoria
precisa registrar quem é o *ator autenticado* (via `requireOwner()`/sessão),
informação que não está disponível de forma confiável dentro de um trigger
sem depender de `current_setting` customizado, o que adicionaria
complexidade desproporcional ao valor nesta fase.

### 3. Configurações do sistema: tabela `system_settings` chave/valor simples
`system_settings (key text primary key, value jsonb, updated_by, updated_at)`.
Alternativa descartada: colunas tipadas fixas — rejeitada porque a lista de
parâmetros ainda é incerta (ver Open Questions) e chave/valor evita nova
migration a cada novo parâmetro.

### 4. Convites/sessões: Auth Admin API para convites, RPC própria para revogar sessão
Listagem de convites pendentes deriva de `profiles.status = 'invited'`
(já existente); reenvio (`admin.inviteUserByEmail` de novo no mesmo e-mail) e
cancelamento (`admin.deleteUser`) usam `supabase.auth.admin.*` (mesma API já
usada por `invite()` em `supabase-user-repository.ts`), expostos via um novo
`IInviteSessionRepository`/`InviteSessionService`.

Revogação de sessão **não** usa a Auth Admin API: a versão instalada do
`@supabase/auth-js` (2.x, a mesma usada pelo Supabase local) só expõe
`admin.signOut(jwt)`, que exige o token da própria sessão a encerrar — não
existe um método para revogar todas as sessões de um usuário a partir do seu
`id` (confirmado testando `DELETE /auth/v1/admin/users/{id}/sessions` no
GoTrue local: `404`). Em vez disso, a revogação é feita por uma função
`security definer` `public.revoke_user_sessions(p_user_id uuid)` que apaga as
linhas do usuário em `auth.sessions` (tabela real do schema `auth`); a FK
`auth.refresh_tokens.session_id → auth.sessions.id` é `on delete cascade`,
então a próxima tentativa de renovação de token do usuário falha, forçando
novo login. Alternativa descartada: `admin.updateUserById(id, { ban_duration
})` — rejeitada porque bane logins futuros, mas não invalida o access token
já emitido nem representa a mesma semântica de "revogar sessão ativa".

### 5. Painel administrativo: página server component, sem nova infra de métricas
`/admin/page.tsx` busca contagens diretamente dos repositórios já existentes
(`users.listAll()`, `roles.findAll()`, convites pendentes) — sem tabela de
métricas agregadas nem cron. Reavaliar apenas se o volume de dados exigir.

### 6. Fix descoberto durante a implementação: `profiles.status` nunca virava `'invited'`
Ao testar o fluxo de convite ponta a ponta, `profiles.status` permanecia
`'active'` mesmo para um usuário recém-convidado — a coluna tem esse valor
como default e `handle_new_user()` (de `fundacao-schema-auth`) nunca o
sobrescrevia. Isso tornava a feature de "Convites & Sessões" desta change
inútil (nunca haveria um convite pendente para listar). Corrigido numa
migration própria (`20260710171500_fundacao_fix_invited_status.sql`) que
reescreve `handle_new_user()` para checar `auth.users.invited_at`/
`email_confirmed_at`, mais uma trigger `AFTER UPDATE` para o caso (observado
empiricamente no GoTrue local) de `invited_at` ser populado numa instrução
separada da inserção original, e para reverter o perfil a `'active'` quando
o convite é aceito. Tratado como parte desta change por ser um bloqueador
direto do requisito de `gestao-de-convites-e-sessoes`, não por estar listado
na proposta original.

## Risks / Trade-offs

- [Risco] Instrumentar auditoria manualmente nos services é fácil de
  esquecer em ações futuras → Mitigação: revisão de tasks cobre todos os
  pontos de escrita atuais; um teste de cada fluxo confirma que o registro é
  criado.
- [Risco] Tabela `audit_log` pode crescer rápido sem retenção → Mitigação:
  fora de escopo agora, mas a tabela já nasce com índice em `created_at` para
  permitir paginação/retenção futura sem migration adicional.
- [Risco] Mudar a estrutura de `SidebarItem`/`SidebarSection` pode quebrar o
  spec `navegacao-por-area` para as demais áreas → Mitigação: `children` é
  opcional e só populado para a seção Admin; comportamento de áreas de
  negócio não muda.

## Migration Plan

1. Migration SQL única adicionando `audit_log` e `system_settings` (mais
   RLS: leitura/escrita restrita a `owner`, seguindo o padrão já usado nas
   migrations anteriores).
2. Repositórios/serviços novos + instrumentação dos services existentes.
3. UI: fix da sidebar primeiro (desbloqueia acesso manual às telas restantes
   durante o desenvolvimento), depois `/admin` (painel), depois as 3 telas
   novas.
4. Sem dado a migrar de sistemas anteriores; rollback = reverter a migration
   (tabelas novas, sem alteração de dados existentes).

## Open Questions

- Quais parâmetros exatos entram em "configurações do sistema" na primeira
  versão, além do teto de faturamento MEI mencionado na proposta? Assumir
  como decisão de implementação (tasks) uma lista mínima inicial editável,
  com espaço para adicionar mais chaves sem nova migration.
