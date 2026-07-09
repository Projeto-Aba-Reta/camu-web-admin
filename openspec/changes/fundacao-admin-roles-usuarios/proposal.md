## Why

`fundacao-schema-auth` cria o schema de roles/sub-roles e `fundacao-sidebar-e-shell` reserva o espaço de navegação "Administração", mas nenhum dos dois entrega uma forma do Owner efetivamente cadastrar áreas, convidar pessoas e atribuir acesso — hoje isso só seria possível manualmente via Supabase Studio. Sem essas telas, o requisito central da Fase 1 ("Owner cadastra todas as roles e subroles") não está atendido, e o banco nasceria vazio sem um caminho guiado para popular a divisão de áreas já conhecida da Camu.

## What Changes

- Cria as telas de Owner em `(dashboard)/admin/roles`: listar, criar, editar e excluir roles e suas sub-roles.
- Cria as telas de Owner em `(dashboard)/admin/usuarios`: listar usuários, convidar novo usuário por e-mail, e atribuir/remover roles e sub-roles de um usuário (incluindo alterar `user_type` entre `owner`/`socio`/`member`).
- Implementa o script `npm run seed-roles` (`scripts/seed-roles.ts`), que usa a camada de services/repositórios (não SQL solto) para popular, de forma idempotente, as roles e a divisão sócio→área hoje documentadas em `camu-docs/01-visao-geral/sociedade-e-divisao.md`: Produção, Marketplace/Vendas, Site, Assinatura, Infra/Automação, Financeiro, Societário, com 3 usuários de exemplo (Sócio A, B e C) refletindo essa divisão — deixando explícito, no script e na UI, que é um ponto de partida editável, não uma verdade fixa.
- Restringe todas essas telas e a Server Action de convite a usuários com `user_type = 'owner'`.

## Capabilities

### New Capabilities
- `gestao-de-roles`: CRUD de roles e sub-roles pelo Owner.
- `gestao-de-usuarios`: convite de usuários e atribuição/remoção de roles, sub-roles e `user_type` pelo Owner.
- `seed-de-dados-iniciais`: script que popula roles e usuários de exemplo a partir da divisão sócio→área do `camu-docs`.

### Modified Capabilities
(nenhuma — `controle-de-acesso` de `fundacao-schema-auth` não muda de requisito; esta proposta só adiciona a UI e o seed por cima do schema já especificado)

## Impact

- **Depende de**: `fundacao-schema-auth` (schema, repositórios/services de roles e usuários, client `service_role` para convite) e `fundacao-sidebar-e-shell` (seção "Administração" reservada na sidebar, componentes de shell/design system).
- **Novo**: `src/app/(dashboard)/admin/{roles,usuarios}/**`, `src/components/admin/{role-form,sub-role-form,user-role-assign}.tsx`, `scripts/seed-roles.ts`, entrada `seed-roles` em `package.json`.
- **Domínio de gestão**: fundação/plataforma — não é nenhum dos 5 domínios de negócio; é a ferramenta que o Owner usa para configurar o próprio painel.
- **Dependência de `camu-docs`**: direta — o conteúdo do seed (`scripts/seed-roles.ts`) reproduz a tabela sócio→área de `camu-docs/01-visao-geral/sociedade-e-divisao.md`, hoje marcada como provisória; o script e sua documentação devem deixar claro que essa divisão pode mudar e é só um ponto de partida.
- Fecha a Fase 1 (Fundação) do roadmap — a partir daqui, o Owner consegue operar o modelo de acesso sem intervenção manual no banco, e as fases de domínio seguintes (Financeiro, Produção, Vendas, Assinatura, Societário) podem assumir que roles/sub-roles já existem e são gerenciáveis.
