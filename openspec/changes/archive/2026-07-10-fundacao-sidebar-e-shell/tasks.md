## 1. Design system base (UI)

- [x] 1.1 Rodar `npx shadcn@latest init` (Tailwind v4, sem `tailwind.config.js`) e instalar componentes iniciais: `button`, `avatar`, `dropdown-menu`, `sheet`, `switch`, `separator`, `badge`, `breadcrumb`, `tooltip`
- [x] 1.2 Adicionar bloco de tokens de dashboard em `src/app/globals.css` (`@theme inline`) mapeando a paleta da marca (Teal/Coral/Charcoal/Off-white) + escala neutra para bordas/tabelas, sem herdar `.sticker-shadow*`
- [x] 1.3 Configurar `lucide-react` e helper `cn()` em `src/lib/utils.ts` (se ainda não existir de `fundacao-schema-auth`)

## 2. Navegação por área (backend leve/lógica pura)

- [x] 2.1 Criar `src/lib/navigation/area-routes.ts` (registro estático `slug → { href, icon }`), com apenas a entrada de "Home" nesta fase
- [x] 2.2 Criar `src/lib/navigation/build-sidebar.ts`: função pura `(profile, scope) => SidebarSection[]`, aplicando as regras de Owner/Sócio/Member e o cruzamento com `area-routes`
- [x] 2.3 Cobrir `build-sidebar` com casos de teste manuais/unitários para: Owner sem roles, Member com uma role, role sem rota implementada

## 3. Escopo de visualização do Sócio (backend leve/lógica pura + UI)

- [x] 3.1 Definir Server Action que seta o cookie `camu_sidebar_scope` (`own`/`all`) — só permitida para `user_type = 'socio'`
- [x] 3.2 Garantir que o cookie não tenha `Max-Age` persistente entre logins (limpo/resetado no fluxo de login de `fundacao-schema-auth`)
- [x] 3.3 Criar `src/components/layout/area-scope-toggle.tsx`, renderizado só quando `userType === 'socio'`, chamando a Server Action de 3.1

## 4. Shell do dashboard (UI)

- [x] 4.1 Criar `src/components/layout/sidebar.tsx` e `sidebar-nav-item.tsx`, consumindo `build-sidebar`
- [x] 4.2 Criar `src/components/layout/topbar.tsx` com breadcrumb, menu do usuário (avatar/dropdown) e ação de sign-out
- [x] 4.3 Atualizar `src/app/(dashboard)/layout.tsx` (criado em `fundacao-schema-auth`) para ler o cookie de escopo, montar `build-sidebar` e renderizar sidebar + topbar + `area-scope-toggle` ao redor do `children`
- [x] 4.4 Criar componente de cabeçalho de página padronizado (título + slot de ação primária) para reuso pelas fases de domínio futuras
- [x] 4.5 Reservar item "Administração" na sidebar (sem sub-itens ainda) visível só para `user_type = 'owner'`

## 5. Verificação

- [x] 5.1 Testar manualmente com um usuário Owner: sidebar mostra todas as roles cadastradas + seção Administração
- [x] 5.2 Testar manualmente com um usuário Sócio com 1 role atribuída: sidebar mostra só essa área; ativar o toggle mostra todas; logout e login novamente volta ao padrão restrito
- [x] 5.3 Testar manualmente com um Member sem nenhuma role atribuída: sidebar mostra só os itens comuns (ex.: Home), sem seção Administração e sem toggle
- [x] 5.4 Confirmar visualmente que os componentes do dashboard não usam a linguagem "Sticker Pop" da landing page
