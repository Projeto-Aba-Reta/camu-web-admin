# Deploy do ambiente de desenvolvimento (Supabase + Vercel)

Guia para colocar o `camu-web-admin` no ar em um **ambiente de dev
compartilhado** — uma URL que os sócios conseguem abrir do celular, sem
Docker e sem `npm run dev`.

A ideia é ter dois ambientes separados desde já:

| Ambiente | Banco (Supabase)             | App (Vercel)       | Branch      |
| -------- | ---------------------------- | ------------------ | ----------- |
| Local    | Docker (`make dev`)        | `localhost:3000` | qualquer    |
| Dev      | projeto`camu-dev` na nuvem | URL da Vercel      | `develop` |

O ambiente de produção (`master`) fica para depois, e vai exigir **um segundo
projeto Supabase** — nunca aponte dev e prod para o mesmo banco, porque o dev
vai receber dados de teste e migrations ainda instáveis.

Pré-requisitos: contas no [Supabase](https://supabase.com) e na
[Vercel](https://vercel.com) (o plano free serve para dev, com uma ressalva
sobre cron descrita na [Parte 3](#parte-3--o-cron-da-fila-de-impressão)), e
acesso de escrita ao repositório `Projeto-Aba-Reta/camu-web-admin`.

---

## Parte 1 — Supabase hospedado

### 1.1 Criar o projeto

No [dashboard do Supabase](https://supabase.com/dashboard) → **New project**:

- **Name**: `camu-dev`
- **Database password**: gere uma senha forte e **guarde no gerenciador de
  senhas** — ela é pedida no `db push` e não dá para vê-la de novo depois.
- **Region**: `South America (São Paulo)` — menor latência para o time.
- **Postgres version**: 17. O `supabase/config.toml` declara
  `major_version = 17`; subir um banco em outra major diverge do local.

O provisionamento leva ~2 minutos.

### 1.2 Pegar as credenciais

Em **Project Settings → API**, anote os três valores que o app usa
(os mesmos nomes do `.env.example`):

| Onde aparece no dashboard                      | Variável                         |
| ---------------------------------------------- | --------------------------------- |
| Project URL                                    | `NEXT_PUBLIC_SUPABASE_URL`      |
| Project API keys →`anon` `public`         | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Project API keys →`service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY`     |

> A `service_role` **ignora todas as políticas de RLS**. Ela só existe no
> servidor (`src/lib/supabase/admin.ts`, usada por convite de usuário e pelo
> cron). Nunca a coloque em variável `NEXT_PUBLIC_*`, nunca a cole no Slack e
> nunca a commite.

### 1.3 Aplicar as migrations

A CLI já é devDependency do projeto, então dá para rodar tudo com `npx`, na
raiz do repositório:

```bash
npx supabase login                       # abre o navegador, gera um token
npx supabase link --project-ref <ref>    # <ref> = ID do projeto (Settings → General)
npx supabase db push                     # aplica supabase/migrations/ no banco remoto
```

O `db push` aplica as 14 migrations em ordem e cria também o bucket de
Storage `product-media` (feito pela migration
`20260710180003_catalogo_storage_midia.sql`) — não precisa criar bucket na
mão.

Confira o resultado com `npx supabase migration list`: as colunas Local e
Remote devem estar iguais.

### 1.4 Criar o usuário Owner (passo que quase todo mundo esquece)

**`supabase/seed.sql` não roda no banco remoto** — ele só é aplicado no
`supabase db reset` local. Ou seja: depois do `db push` o banco está com o
schema completo e **zero usuários**, e sem um Owner não existe ninguém que
possa convidar os demais pela UI.

No dashboard, **Authentication → Users → Add user → Send invitation** (ou
**Create new user** com senha, se preferir não depender de e-mail), com o seu
e-mail real. O trigger `on_auth_user_created` cria o `public.profiles`
correspondente com `user_type = 'member'`. Promova para Owner no **SQL
Editor**:

```sql
update public.profiles
   set user_type = 'owner'
 where email = 'seu-email@dominio.com';
```

O Owner tem bypass de RLS e enxerga todas as áreas, incluindo `/admin/roles` e
`/admin/usuarios` — a partir daí os outros usuários entram por convite pela
própria aplicação.

### 1.5 Configurar o Auth

Três ajustes em **Authentication**, todos necessários para o convite funcionar
na URL da Vercel. Faça-os **depois** de ter a URL do deploy (Parte 2) e volte
aqui — ou já preencha com a URL que a Vercel vai gerar, se você a definiu.

1. **URL Configuration → Site URL**: a URL do ambiente de dev, por exemplo
   `https://camu-web-admin-dev.vercel.app` (sem barra no final). O template de
   convite monta o link a partir de `{{ .SiteURL }}`; se ficar em
   `localhost`, o convite chega apontando para a máquina de quem clicou.
2. **URL Configuration → Redirect URLs**: adicione
   `https://<sua-url>.vercel.app/**`. Se for usar Preview Deployments (uma URL
   por PR), adicione também `https://camu-web-admin-*.vercel.app/**`.
3. **Emails → Invite user**: substitua o template padrão pelo conteúdo de
   `supabase/templates/invite.html`:

   ```html
   <h2>Você foi convidado para o Camu Admin</h2>

   <p>Clique no link abaixo para aceitar o convite e definir sua senha de acesso:</p>

   <p>
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password">
       Aceitar convite
     </a>
   </p>
   ```

   Isso **não é cosmético**. O template padrão do Supabase usa
   `{{ .ConfirmationURL }}`, que devolve os tokens no *fragmento* da URL
   (`#access_token=...`) — e fragmento não é enviado ao servidor, então o
   route handler `/auth/confirm` (que espera `token_hash` na query string)
   nunca recebe nada e o convite morre numa tela de login. O `config.toml`
   configura isso para o ambiente local; **o dashboard não lê o
   `config.toml`**, é preciso colar o template lá.

Recomendado ainda: **Providers → Email → desligue "Enable signup"**. Este é um
painel interno, o acesso é só por convite. (No local o signup fica ligado por
conveniência.)

E-mail no plano free: o SMTP embutido do Supabase tem limite baixo (poucos
e-mails por hora) e serve só para teste. Se os convites começarem a falhar,
configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

---

## Parte 2 — Vercel

### 2.1 Importar o projeto

No [dashboard da Vercel](https://vercel.com/new) → **Import Git Repository** →
`Projeto-Aba-Reta/camu-web-admin`.

A Vercel detecta Next.js sozinha. **Não altere** Build Command, Output
Directory nem Install Command — os defaults (`next build`) estão corretos.
O `.npmrc` do repositório força `script-shell=bash`, o que funciona
normalmente no build da Vercel (Linux).

### 2.2 Apontar o ambiente de dev para a branch `develop`

Em **Settings → Git → Production Branch**, troque `master` por **`develop`**.

Com isso, cada push em `develop` publica no domínio principal do projeto
(a URL estável que o time vai usar), e `master` fica reservado para quando
existir um projeto de produção separado. Pushes em outras branches continuam
gerando Preview Deployments com URL própria.

### 2.3 Variáveis de ambiente

Em **Settings → Environment Variables**, adicione (marcando os ambientes
Production e Preview):

| Variável                         | Valor                                       | Obrigatória     |
| --------------------------------- | ------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL do`camu-dev`                  | sim              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do`camu-dev`                     | sim              |
| `SUPABASE_SERVICE_ROLE_KEY`     | service_role key do`camu-dev`             | sim              |
| `CRON_SECRET`                   | valor aleatório —`openssl rand -hex 32` | não (ver Parte 3) |
| `SLACK_WEBHOOK_URL`             | webhook de Incoming Webhook do Slack        | não             |

Duas variáveis do `.env.example` que **não** vão para a Vercel:

- **`PORT`** — a Vercel gerencia a porta. Defini-la pode quebrar o runtime.
- Qualquer chave do Supabase local (`http://127.0.0.1:54321`, `demo` keys).

As duas opcionais não quebram nada quando ficam em branco: sem
`SLACK_WEBHOOK_URL` a notificação de impressão concluída vira um no-op com log
de aviso (`src/lib/services/slack-notification-service.ts`), e sem `CRON_SECRET`
a conclusão automática de impressões não roda — só a manual, pela UI (Parte 3).

### 2.4 Deploy

**Deploy**. Ao final, anote a URL gerada e **volte ao passo 1.5** para colocá-la
como Site URL no Supabase, se ainda não fez.

---

## Parte 3 — O cron da fila de impressão (opcional, desligado por padrão)

A fila de impressão conclui um item de duas formas: **manualmente**, pelo botão
na UI, e **automaticamente**, quando o tempo estimado da impressão esgota. A
conclusão automática mora numa rota HTTP (`/api/cron/complete-print-queue`) que
precisa de alguém a chamando de tempos em tempos — e **esse agendador não vem
configurado**.

O motivo é o plano: no Hobby (free) a Vercel só aceita cron **uma vez por dia**,
e um cron diário para concluir impressões de poucas horas não serve para nada.
Por isso o repositório **não tem `vercel.json`** — sem cron declarado, o deploy
no Hobby passa limpo.

**Nada quebra com isso.** Sem agendador, a rota simplesmente nunca é chamada
(e, sem `CRON_SECRET`, responde 401 a quem tentar). O item fica em `imprimindo`
mostrando "tempo estimado esgotado" até alguém concluir pela UI — que é o fluxo
normal em dev. A env `CRON_SECRET` é **opcional**: só faz sentido preenchê-la se
você for ligar um dos agendadores abaixo.

### Opção A — GitHub Actions (funciona no plano free)

Um workflow agendado chamando a rota de fora. Configure `CRON_SECRET` na Vercel
(qualquer valor aleatório, `openssl rand -hex 32`) e o **mesmo valor** como
secret do repositório, e crie `.github/workflows/print-queue-cron.yml`:

```yaml
on:
  schedule:
    - cron: "*/5 * * * *"
jobs:
  complete-print-queue:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://<sua-url>.vercel.app/api/cron/complete-print-queue
```

A rota aceita GET e POST justamente para não depender do agendador. Na prática o
GitHub atrasa schedules curtos em horário de pico — para dev, tudo bem.

### Opção B — Vercel Cron (exige plano Pro)

Se um dia o projeto subir para o Pro, basta recriar o `vercel.json` na raiz:

```json
{ "crons": [{ "path": "/api/cron/complete-print-queue", "schedule": "*/5 * * * *" }] }
```

e definir `CRON_SECRET` nas env vars — a Vercel injeta o header
`Authorization: Bearer <CRON_SECRET>` sozinha nas invocações de cron, não há
mais nada a configurar.

> No ambiente **local** nada disso é necessário: o `make dev` já sobe, em
> paralelo, o `npm run dev:cron` (`scripts/run-print-queue-cron.ts`), que roda a
> mesma rotina a cada 15s chamando o service direto.

---

## Checklist de validação

Depois do primeiro deploy, confirme nesta ordem — cada item falha de um jeito
diferente:

1. A URL abre e redireciona para `/login` (env vars do Supabase chegaram ao
   build).
2. Login com o Owner criado no passo 1.4 funciona e cai no dashboard.
3. `/admin/usuarios` → convidar um e-mail seu → o e-mail chega e o link leva a
   `/set-password` (Site URL + template de convite corretos).
4. Uma tela com dados (ex.: catálogo) carrega sem erro de permissão (RLS +
   migrations aplicadas).
5. Upload de foto de peça funciona (bucket `product-media` criado pelo
   `db push`).

Se quiser dados de exemplo em dev, os scripts `npm run seed-*` são idempotentes
e usam a mesma camada de services do app — dá para rodá-los apontando o
`.env.local` para o projeto remoto. **Pense duas vezes:** eles criam usuários
fictícios `@camu.local` e premissas de custo marcadas como "a validar" no
`camu-docs`. Em um ambiente que os sócios vão olhar, isso confunde mais do que
ajuda. Prefira cadastrar meia dúzia de registros reais pela UI.

---

## Rotina do dia a dia

**Nova migration:**

```bash
npm run db:migration:new nome_da_migration   # cria o arquivo
make db-reset                                # valida do zero no local
npx supabase db push                         # aplica no camu-dev
```

Push da migration **antes** do deploy do código que depende dela — o inverso
deixa o app em produção chamando colunas que ainda não existem.

**Regenerar os types depois de mexer no schema:** `npm run db:types` lê do banco
**local** (`--local`). Rode `make db-reset` antes, para o local estar em dia com
as migrations.

**Rollback:** não existe `db push --revert`. Reverter é escrever uma migration
nova que desfaz a anterior. Em dev, se o banco embolar de vez, o caminho rápido
é resetar o projeto (**Settings → General → Reset database**) e rodar `db push`
de novo — mas isso **apaga os dados**, incluindo o usuário Owner (refazer o
passo 1.4).

---

## Troubleshooting

| Sintoma                                                | Causa provável                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Build da Vercel falha em`next build` com erro de env | Alguma das 3 chaves do Supabase não foi marcada para o ambiente do deploy (Production**e** Preview são checkboxes separados). |
| App carrega mas todo dado vem vazio                    | RLS ativa e o usuário não é Owner/não tem role — cheque`public.profiles.user_type`.                                            |
| Convite chega mas o link cai em`/login`              | Template de convite não foi colado no dashboard (ainda é o`{{ .ConfirmationURL }}` padrão). Ver 1.5.                             |
| Convite chega apontando para`localhost`              | Site URL do Supabase não foi trocada. Ver 1.5.                                                                                       |
| Convite não chega                                     | Limite de e-mail do SMTP embutido. Configure SMTP próprio.                                                                           |
| Impressão fica em "tempo esgotado" e não conclui sozinha | Esperado: não há cron configurado. Conclua pela UI, ou ligue um agendador (Parte 3).                                              |
| Cron configurado responde 401                          | `CRON_SECRET` ausente na Vercel, ou diferente do valor usado pelo agendador. Ver Parte 3.                                          |
| `db push` reclama de migration já aplicada          | Histórico remoto divergiu; inspecione com`npx supabase migration list`.                                                            |
