## Why

O change `fundacao-schema-auth` entrega login e um layout de dashboard mínimo, mas sem navegação real: nenhuma sidebar filtrada por área, nenhuma forma do Sócio alternar entre "minhas áreas" e "todas as áreas", e nenhuma identidade visual própria de painel administrativo (hoje só existe o estilo "Sticker Pop" da landing page pública). Sem isso, nenhuma tela de domínio (financeiro, produção, vendas, assinatura, societário) das fases seguintes tem onde se encaixar na navegação.

## What Changes

- Implementa o shell autenticado do dashboard: sidebar fixa/colapsável + topbar (breadcrumb, menu do usuário com sign-out) + área de conteúdo com cabeçalho de página padronizado.
- Implementa a lógica de filtragem da sidebar por `user_type` e pelas roles/sub-roles do usuário logado: Owner sempre vê tudo; Sócio e Member veem por padrão só as áreas em que têm role atribuída.
- Implementa o toggle "ver todas as áreas", exclusivo para `user_type = 'socio'`: ação deliberada de UI (não persiste como padrão, reseta a cada login) que expande a sidebar para mostrar todas as áreas cadastradas — sem alterar nenhuma permissão de dado, já que Sócio já tem bypass total de RLS desde `fundacao-schema-auth`.
- Cria o registro estático de tradução `slug de role → rota implementada` (`area-routes`), que cada fase de domínio futura vai estender ao publicar sua própria página.
- Introduz a base do design system do dashboard: shadcn/ui + Radix sobre Tailwind v4, tokens de marca da Camu (Teal, Coral, Charcoal, Off-white) adaptados para um visual denso/utilitário — explicitamente diferente do "Sticker Pop" da landing page.
- Seção "Administração" da sidebar visível somente para `user_type = 'owner'` (os itens dentro dela — CRUD de roles/usuários — são entregues em `fundacao-admin-roles-usuarios`; aqui só o espaço de navegação é reservado).

## Capabilities

### New Capabilities
- `navegacao-por-area`: sidebar dinâmica filtrada por role/sub-role do usuário logado, com o mapeamento de roles cadastradas para rotas implementadas.
- `escopo-de-visualizacao-socio`: toggle "ver todas as áreas" disponível só para Sócio, seu comportamento padrão (restrito às áreas próprias) e seu reset a cada login.
- `shell-do-dashboard`: layout autenticado (sidebar + topbar + área de conteúdo) e a base de design system (shadcn/ui + tokens da marca) usada por todas as telas do painel.

### Modified Capabilities
(nenhuma — as capabilities de `fundacao-schema-auth` não mudam de requisito, só passam a ser consumidas por uma UI real)

## Impact

- **Depende de**: `fundacao-schema-auth` (sessão, `CurrentUser` com `userType`/roles/sub-roles, e as tabelas `roles`/`user_roles`).
- **Novo**: `src/components/layout/{sidebar,sidebar-nav-item,topbar,area-scope-toggle}.tsx`, `src/lib/navigation/{area-routes,build-sidebar}.ts`, `src/components/ui/*` (primitives shadcn/ui), bloco `@theme inline` de tokens de dashboard em `src/app/globals.css`.
- **Modificado**: `src/app/(dashboard)/layout.tsx` (de `fundacao-schema-auth`), que passa a montar o shell completo em vez do placeholder mínimo.
- **Domínio de gestão**: fundação/plataforma — não é nenhum dos 5 domínios de negócio; é a camada de navegação que todos eles vão usar.
- **Dependência de `camu-docs`**: nenhuma dependência de regra de dados; a existência do toggle de Sócio reflete a estrutura societária descrita em `camu-docs/01-visao-geral/sociedade-e-divisao.md`, mas nenhuma área específica é hardcoded aqui.
- Habilita `fundacao-admin-roles-usuarios` (que populará a seção "Administração" reservada aqui) e todas as fases de domínio seguintes (cada uma estende `area-routes` ao publicar sua página).
