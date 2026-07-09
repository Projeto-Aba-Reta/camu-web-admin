# configuracao-de-ambiente

## Purpose

Chaveamento do backend de dados por ambiente (Supabase local via Docker em desenvolvimento, Supabase hospedado em outros ambientes) via variáveis de ambiente, sem alterar código entre ambientes.

## Requirements

### Requirement: Backend de dados chaveado por variáveis de ambiente
O sistema SHALL determinar qual instância do Supabase usar (local ou hospedada) exclusivamente por meio de variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), sem exigir alteração de código entre ambientes.

#### Scenario: Execução local
- **WHEN** a aplicação roda com as variáveis de ambiente apontando para a instância local do Supabase iniciada via `supabase start`
- **THEN** todas as operações de autenticação e dados são feitas contra o Postgres local rodando em Docker

#### Scenario: Execução em ambiente hospedado
- **WHEN** a aplicação roda com as variáveis de ambiente apontando para um projeto Supabase hospedado
- **THEN** todas as operações de autenticação e dados são feitas contra o projeto hospedado, usando exatamente o mesmo código da execução local

### Requirement: Segredos não commitados
O sistema SHALL manter um arquivo `.env.example` versionado documentando as variáveis de ambiente esperadas, sem valores reais, e SHALL manter os arquivos com valores reais (`.env.local` e equivalentes) fora do controle de versão.

#### Scenario: Novo desenvolvedor clona o repositório
- **WHEN** um desenvolvedor clona o repositório pela primeira vez
- **THEN** encontra `.env.example` com as chaves necessárias documentadas e nenhum arquivo `.env.local` versionado

### Requirement: Ambiente local reprodutível via Docker
O sistema SHALL permitir que qualquer desenvolvedor suba um ambiente de dados completo (Postgres + Auth) localmente via Docker, sem depender de um projeto Supabase hospedado.

#### Scenario: Setup local do zero
- **WHEN** um desenvolvedor com Docker e Supabase CLI instalados roda o comando de start do Supabase local neste repositório
- **THEN** o ambiente sobe com o schema deste change já aplicável via migrations, sem necessidade de credenciais de um projeto hospedado
