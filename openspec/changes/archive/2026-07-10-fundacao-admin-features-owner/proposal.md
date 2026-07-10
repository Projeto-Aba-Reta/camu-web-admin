## Why

A área "Administração" (gestão de roles e usuários) já foi implementada, mas o item
"Administração" na sidebar é renderizado sem `href`, ficando permanentemente
não clicável — nenhum usuário Owner consegue chegar às telas `admin/roles` e
`admin/usuarios` navegando pela UI. Além disso, hoje a área Admin só cobre
cadastro de usuários e roles; faltam recursos de governança básicos (quem fez
o quê, configurações globais, visão consolidada e controle de convites/sessões)
que só o Owner deve enxergar e operar, essenciais à medida que o número de
sócios/colaboradores com acesso ao painel cresce.

## What Changes

- **Fix**: corrigir a navegação da sidebar para que "Administração" leve a uma
  página real (landing `/admin`), em vez de renderizar um item sem link.
- Transformar "Administração" em uma seção expansível com múltiplos itens
  (Painel, Usuários, Roles, Auditoria, Configurações, Convites & Sessões),
  seguindo o mesmo padrão visual das seções de área já existentes.
- Criar `painel administrativo` (`/admin`) como landing com atalhos e métricas
  resumidas (contagem de usuários por tipo, roles, convites pendentes).
- Criar **log de auditoria**: toda ação administrativa sensível (criar/editar/
  excluir role ou sub-role, convidar usuário, mudar `user_type`, atribuir/
  remover role) passa a gravar um registro consultável só pelo Owner.
- Criar **configurações do sistema**: tela de parâmetros globais editáveis
  (ex.: nome/identidade da Fundação, teto de faturamento MEI usado no alerta
  financeiro, contatos padrão), com histórico de quem alterou.
- Criar **gestão de convites e sessões**: listar convites pendentes (reenviar/
  cancelar) e revogar sessões ativas de um usuário.
- Restringir todas as novas telas e Server Actions a `user_type = 'owner'`,
  reaproveitando `requireOwner()` já existente.

## Capabilities

### New Capabilities
- `dashboard-administrativo`: landing `/admin` com atalhos para as subseções
  e métricas resumidas (usuários por tipo, total de roles, convites pendentes).
- `log-de-auditoria`: registro e consulta de ações administrativas sensíveis
  (quem, o quê, quando, em qual entidade).
- `configuracoes-do-sistema`: tela de parâmetros globais do painel, editável
  e auditável, restrita ao Owner.
- `gestao-de-convites-e-sessoes`: listagem/reenvio/cancelamento de convites
  pendentes e revogação de sessões ativas de usuários.

### Modified Capabilities
- `navegacao-por-area`: o item "Administração" deixa de ser um item único sem
  `href` e passa a ser uma seção com subitens navegáveis; a regra de "item só
  é clicável se houver rota implementada" passa a valer também para os
  subitens dessa seção.

## Impact

- **Sidebar/navegação**: `src/lib/navigation/build-sidebar.ts` (estrutura do
  `ADMIN_ITEM` vira uma lista de subitens) e
  `src/components/layout/sidebar-nav-item.tsx`/`sidebar.tsx` (suporte a item
  com subitens, se necessário).
- **Rotas novas**: `src/app/(dashboard)/admin/page.tsx` (painel),
  `admin/auditoria/**`, `admin/configuracoes/**`, `admin/convites-sessoes/**`,
  todas herdando o guard de `admin/layout.tsx`.
- **Backend/dados**: nova(s) migration(s) para tabelas `audit_log` e
  `system_settings`; novos repositórios/serviços (`AuditLogService`,
  `SystemSettingsService`) seguindo o padrão de `role-service.ts`/
  `user-service.ts` existentes; instrumentação dos services já existentes
  (`role-service.ts`, `user-service.ts`) para emitir eventos de auditoria.
- **Sem dependência direta com regras financeiras/societárias do
  camu-docs** nesta change — o campo de teto MEI em "configurações do
  sistema" é apenas um parâmetro armazenado aqui; o cálculo/alerta de
  faturamento propriamente dito pertence ao domínio financeiro e está fora
  de escopo desta change.
