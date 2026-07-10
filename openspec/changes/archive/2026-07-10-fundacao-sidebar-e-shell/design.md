## Context

`fundacao-schema-auth` já entrega sessão, `CurrentUser` (com `userType`, `roles`, `subRoles`) via `get-current-profile`, e um `(dashboard)/layout.tsx` mínimo (só verifica sessão). Este change constrói a navegação real por cima disso. Como a Camu ainda não tem nenhuma tela de domínio implementada, a sidebar desta fase terá poucos itens reais (Home + Administração) — o valor entregue é o **mecanismo** de filtragem e o design system base, que as fases seguintes vão consumir.

## Goals / Non-Goals

**Goals:**
- Sidebar que reflete fielmente o acesso do usuário logado sem exigir lógica repetida em cada fase futura.
- Toggle de escopo do Sócio que é só uma lente de visualização, nunca uma checagem de segurança.
- Base de design system (shadcn/ui + tokens) que qualquer tela de domínio futura vai herdar sem reconfiguração.

**Non-Goals:**
- Páginas de conteúdo de qualquer domínio (financeiro, produção, vendas, assinatura, societário) — só a casca de navegação.
- CRUD de roles/sub-roles/usuários (fica em `fundacao-admin-roles-usuarios`) — aqui só o item de menu "Administração" é reservado.
- Dark mode — modo claro apenas nesta fase.
- Sidebar responsiva/mobile-first detalhada — o colapsável cobre desktop; comportamento mobile fino é um refinamento futuro.

## Decisions

### 1. Toggle "ver todas as áreas" é estado de UI (cookie), não permissão de dado
Como o Sócio já tem bypass total de RLS (`fundacao-schema-auth`), o toggle nunca muda o que uma query retorna — só o que a sidebar renderiza. Implementado como cookie de sessão `camu_sidebar_scope=own|all`, setado por uma Server Action, lido no `(dashboard)/layout.tsx` para renderizar a sidebar já correta no primeiro render (sem flash de conteúdo). **Resetado a cada novo login** (não é `Max-Age` longo), para honrar o requisito de que "não é o padrão, é uma ação deliberada" — evita o Sócio esquecer o toggle ligado permanentemente. **Alternativa considerada**: guardar o escopo em `localStorage` (mais simples, sem round-trip de Server Action). Rejeitada porque não é lido no server, causando flash de sidebar errada no primeiro paint, e porque não reseta automaticamente por sessão.

### 2. `build-sidebar` como função pura, testável sem request
`src/lib/navigation/build-sidebar.ts` recebe `(profile: CurrentUser, scope: 'own' | 'all')` e devolve a lista de seções/itens já filtrada — sem depender de `cookies()`/`headers()` diretamente. Isso mantém a regra de "toggle é UI" isolada e testável (dado um profile e um scope, a saída é determinística), e separa a lógica de composição da leitura de cookie (que fica no layout).

### 3. Registro estático `area-routes` como ponto de extensão das fases futuras
`src/lib/navigation/area-routes.ts` mapeia `slug de role → { href, icon }`. Um item da sidebar só vira link clicável se **(a)** o usuário tem acesso à role **e** **(b)** existe uma entrada em `area-routes` para aquele slug — roles cadastradas pelo Owner sem página implementada ainda aparecem "cinza"/sem link, evitando 404. Cada fase de domínio futura só precisa adicionar uma entrada nesse registro ao publicar sua página, sem tocar na lógica de filtragem.

### 4. Design system: shadcn/ui + Radix sobre os tokens da marca, mas sem herdar o "Sticker Pop"
A landing page usa uma linguagem lúdica (bordas grossas, sombras de sticker) adequada a marketing, mas não a um painel denso de dados. Decisão: manter a paleta de marca (Teal `#0FBFA0`, Coral `#FF6B4A`, Charcoal `#1B1F1E`, Off-white `#FAF7F2`) e a fonte Space Grotesk como corpo/UI, mas com bordas finas, raios moderados, uma escala neutra real (tipo slate) para bordas/zebra de tabela, e tamanho base menor (14px) — variáveis próprias em um novo bloco `@theme inline` dentro do mesmo `globals.css`, mapeadas para os nomes que o `shadcn init` espera. Baloo 2 (fonte de destaque da marca) fica restrita à wordmark/topbar/tela de login, não ao corpo do dashboard. **Alternativa considerada**: reutilizar 1:1 as classes `.sticker-shadow*` da landing page. Rejeitada — o próprio pedido do usuário é que a identidade visual do dashboard priorize "visualização de status e gerenciamento", não o tom lúdico da marca voltado ao cliente final.

### 5. Componentes shadcn/ui iniciais
Instalados via `npx shadcn@latest init` (modo Tailwind v4, sem `tailwind.config.js`): `button`, `avatar`, `dropdown-menu`, `sheet` (sidebar colapsável em telas menores), `switch` (toggle de escopo), `separator`, `badge`, `breadcrumb`, `tooltip`. Componentes de tabela/formulário mais pesados (TanStack Table, `dialog`, `select`) ficam para `fundacao-admin-roles-usuarios`, que é quem primeiro precisa deles.

## Risks / Trade-offs

- **[Risco]** Cookie de escopo pode divergir do estado real se o Owner alterar as roles do Sócio no meio de uma sessão ativa (a sidebar só reflete no próximo carregamento do layout). → **Mitigação**: aceitável para a Fase 1 (baixo volume de usuários, mudanças de role são raras); revisitar com revalidação em tempo real só se virar problema real.
- **[Risco]** Registro estático `area-routes` exige lembrar de atualizá-lo a cada nova fase; esquecer gera uma role visível mas sem link. → **Mitigação**: comportamento é degradação graciosa (item sem link, não erro), e cada proposta de fase futura deve incluir explicitamente a task de estender `area-routes`.
- **[Risco]** Migrar a identidade visual da landing page ("Sticker Pop") para um tom denso de dashboard pode gerar inconsistência de marca percebida entre os dois produtos. → **Mitigação**: a paleta de cores e a fonte de corpo são mantidas; só a linguagem de bordas/sombras muda, o que é esperado para produtos de naturezas diferentes (marketing vs. ferramenta interna).

## Open Questions

- Comportamento fino de sidebar em mobile (colapsar automaticamente, gestos) fica para um refinamento futuro fora desta fase.
- Se/quando adicionar dark mode ao dashboard, decidir se os tokens de dashboard ganham um par `@media (prefers-color-scheme: dark)` próprio ou seguem o mesmo mecanismo que a landing page vier a adotar (hoje nenhuma delas tem dark mode).
