## Context

`fundacao-schema-auth` já expõe `IRoleRepository`/`IUserRepository` e services de negócio (implicação sub-role→role, convite via `service_role`). `fundacao-sidebar-e-shell` já reserva a seção "Administração" na sidebar e fornece os componentes de shell/design system (shadcn/ui, tokens de dashboard). Este change é o primeiro consumidor real dessas duas fundações e o primeiro a precisar de componentes de tabela/formulário mais pesados.

## Goals / Non-Goals

**Goals:**
- Owner consegue cadastrar/editar/excluir roles e sub-roles sem tocar no banco diretamente.
- Owner consegue convidar usuários e atribuir/remover roles, sub-roles e `user_type` sem tocar no banco diretamente.
- Banco pode nascer populado com os dados reais (ainda que provisórios) da Camu via um comando único e idempotente.

**Non-Goals:**
- Autoatendimento de cadastro (self-signup) — continua não existindo.
- Edição de perfil pelo próprio usuário (nome, senha) — fora de escopo desta fase.
- Auditoria/histórico detalhado de mudanças de permissão além dos campos `granted_by`/`granted_at` já existentes.
- Qualquer tela de domínio de negócio.

## Decisions

### 1. CRUD de roles/sub-roles via Server Actions chamando os services existentes
As telas em `admin/roles` chamam diretamente `role-service.ts` (de `fundacao-schema-auth`) via Server Actions — nenhuma query Supabase nova é escrita fora da camada de repositórios já estabelecida. Formulários usam `dialog`/`sheet` do shadcn/ui (já instalados em `fundacao-sidebar-e-shell`) para criar/editar sem navegação de página cheia, e `TanStack Table` para a listagem com busca/ordenação.

### 2. Convite de usuário reaproveita o fluxo de callback de auth
"Convidar usuário" chama `user-service.ts` → `IUserRepository.inviteUser` (que usa o client `service_role`, já isolado desde `fundacao-schema-auth`) → Supabase Auth envia o e-mail de convite, que redireciona para `auth/callback` (também de `fundacao-schema-auth`) para o usuário definir a senha. Este change não reimplementa nada do fluxo de sessão, só aciona o convite e lista o resultado.

### 3. Alterar `user_type` é uma ação sensível, isolada e restrita ao Owner
Mudar `user_type` de um usuário (ex.: promover a Owner) é uma ação distinta de atribuir role/sub-role, com sua própria confirmação na UI (dialog de confirmação, não um simples select) — dado o impacto de segurança de conceder bypass total de RLS. Um Owner não pode rebaixar a si mesmo se for o único Owner do sistema (regra de negócio no `user-service`, para evitar o sistema ficar sem nenhum Owner).

### 4. Seed via script TypeScript usando services, não SQL solto
`scripts/seed-roles.ts` roda fora do Next.js (via `tsx` ou equivalente, chamado por `npm run seed-roles`) mas importa os mesmos `services`/`repositories` da aplicação (com o client `service_role`), garantindo que o seed respeite as mesmas regras de negócio (ex.: implicação sub-role→role) que a UI. É **idempotente**: cada role/usuário é upsertado por `slug`/`email`, então rodar o comando de novo não duplica dados. **Alternativa considerada**: `supabase/seed.sql` puro (rodado automaticamente por `supabase db reset`). Rejeitada como script principal porque criação de usuários via `auth.admin` não é bem coberta por SQL puro (precisa da Admin API do GoTrue) — mas o `seed.sql` continua existindo para dados triviais se necessário, com o seed de roles/usuários centralizado no script TS.
- Dados do seed (roles): Produção, Marketplace/Vendas, Site, Assinatura, Infra/Automação, Financeiro, Societário.
- Usuários de exemplo: `socio-a@camu.local`, `socio-b@camu.local`, `socio-c@camu.local`, todos `user_type = 'socio'`. Atribuições: Sócio A → Produção + Marketplace/Vendas; Sócio B → Site + Assinatura + Infra/Automação; Financeiro e Societário sem role atribuída a ninguém por padrão; Sócio C sem nenhuma role própria (reflete o gap documentado em `camu-docs`).
- Script imprime um aviso explícito de que essa divisão é provisória e deve ser revisada pelo Owner via UI.

## Risks / Trade-offs

- **[Risco]** Seed com e-mails fictícios (`@camu.local`) pode ser confundido com dados reais se rodado sem atenção em um ambiente compartilhado. → **Mitigação**: script só deve ser documentado/recomendado para uso em ambiente local (`supabase start`); README deixa isso explícito, e o script loga um aviso antes de rodar.
- **[Risco]** Regra de "não permitir remover o último Owner" pode ter caso de borda (ex.: dois Owners rebaixando um ao outro simultaneamente). → **Mitigação**: checagem feita dentro de uma transação/RPC no banco (não só no client), para ser a fonte de verdade mesmo sob concorrência.
- **[Risco]** UI de atribuição de sub-role sem a role pai marcada pode confundir o Owner sobre por que a role apareceu sozinha. → **Mitigação**: a UI exibe visualmente a sub-role aninhada sob a role no formulário de atribuição, deixando a implicação clara antes de salvar.

## Open Questions

- Se e quando adicionar edição de perfil pelo próprio usuário (nome, avatar, troca de senha) — fica para uma fase futura, fora do escopo da Fundação.
- Necessidade de um "modo dry-run" no `seed-roles` (mostrar o que seria criado sem aplicar) — pode ser adicionado depois se o script crescer em complexidade.
