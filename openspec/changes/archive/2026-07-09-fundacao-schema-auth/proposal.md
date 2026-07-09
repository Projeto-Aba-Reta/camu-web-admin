## Why

O `camu-web-admin` está em fase de fundação: não existe nenhum código, banco de dados ou mecanismo de autenticação. Antes de construir qualquer tela de domínio (financeiro, produção, vendas, assinatura, societário), o painel precisa de uma base comum de login e controle de acesso, já que cada usuário (Owner, Sócio ou funcionário) deve enxergar e operar apenas as áreas que lhe cabem. Esta é a primeira mudança da Fase 1 (Fundação) do roadmap e viabiliza tecnicamente todas as fases seguintes.

## What Changes

- Cria o schema de dados no Supabase para identidade e controle de acesso: `profiles` (com `user_type`: `owner` | `socio` | `member`), `roles` (áreas de negócio, cadastradas dinamicamente — sem seed neste change), `sub_roles` (permissões dentro de uma área), e as tabelas de associação `user_roles` / `user_sub_roles`.
- Habilita Row Level Security em todas as tabelas acima e cria funções `SECURITY DEFINER` reutilizáveis pelas fases futuras: `is_owner()`, `is_socio_or_owner()`, `has_role(slug)`, `has_sub_role(slug)`.
- Faz o scaffold inicial do projeto Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, seguindo as convenções já usadas no repositório irmão `camu-web-landing-page` (sem `tailwind.config.js`, tema via `@theme inline`).
- Introduz uma camada de repositórios com interfaces (`IRoleRepository`, `IUserRepository`, ...) e services de negócio por cima delas, desacoplando o restante do app do Supabase — troca de provedor de dados no futuro exige só uma nova implementação das interfaces.
- Implementa a tela pública de login (e-mail + senha via Supabase Auth) e o fluxo de sessão: clients Supabase (browser/server/middleware), middleware de proteção de rotas, e client `service_role` isolado (server-only) para operações administrativas como convite de usuário.
- Configura o chaveamento de ambiente por variáveis: banco Supabase local via Docker (`supabase start`) no desenvolvimento, projeto Supabase hospedado em outros ambientes, com segredos em `.env.local`/variáveis do host e `.env.example` documentando as chaves esperadas.
- Atualiza o `README.md` com o passo a passo de setup local, incluindo como criar o primeiro usuário Owner.

Não há cadastro público de usuários neste change — só o Owner (promovido manualmente no primeiro setup) pode convidar novos usuários, o que será entregue como parte da gestão de usuários em `fundacao-admin-roles-usuarios`.

## Capabilities

### New Capabilities
- `autenticacao`: login público por e-mail/senha, criação e renovação de sessão, logout, e proteção de rotas do dashboard para usuários não autenticados.
- `controle-de-acesso`: modelo de `user_type` (Owner/Sócio/Member), catálogo de roles e sub-roles, atribuição de roles/sub-roles a usuários, e aplicação desse modelo via RLS no banco (incluindo o bypass total de Owner/Sócio).
- `configuracao-de-ambiente`: chaveamento do backend de dados por ambiente (Supabase local via Docker em desenvolvimento, Supabase hospedado em outros ambientes) via variáveis de ambiente, sem alterar código entre ambientes.

### Modified Capabilities
(nenhuma — repositório greenfield, não há specs existentes)

## Impact

- **Novo**: `package.json` e todo o scaffold Next.js do projeto (hoje inexistente).
- **Novo**: schema Supabase (`supabase/migrations/*.sql`), incluindo RLS e funções `SECURITY DEFINER`.
- **Novo**: camada `src/lib/repositories/` (interfaces + implementações Supabase) e `src/lib/services/`.
- **Novo**: `src/lib/supabase/*`, `src/middleware.ts`, rotas `(public)/login`, `auth/callback`, `auth/sign-out`.
- **Novo**: `.env.example`, scripts `supabase:start`/`supabase:stop`/`supabase:reset`/`db:types`/`db:migration:new` em `package.json`.
- **Dependência de `camu-docs`**: conceitual — a distinção Owner vs. Sócio reflete a estrutura societária descrita em `camu-docs/01-visao-geral/sociedade-e-divisao.md` (3 sócios, divisão de áreas ainda provisória). Não há dependência de regras de dados de nenhum domínio específico (financeiro, produção etc.) neste change.
- **Domínio de gestão**: fundação/plataforma — não é nenhum dos 5 domínios de negócio (financeiro, produção, vendas, assinatura, societário); é a base técnica que as fases seguintes vão consumir via as funções de RLS aqui criadas.
- Bloqueia/habilita os changes seguintes da Fase 1: `fundacao-sidebar-e-shell` (consome o modelo de sessão e roles) e `fundacao-admin-roles-usuarios` (consome o schema e os repositórios de roles/usuários).
