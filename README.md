# Camu Web Admin

Painel administrativo interno da **Camu 3D** — plataforma web para que os
sócios/funcionários da empresa gerenciem a operação do negócio como um
todo: produção, catálogo, vendas (marketplace e direta), assinatura
recorrente e controle financeiro/societário.

> Este repositório está em fase de fundação: só existem login, sessão e o
> modelo de controle de acesso (Owner/Sócio/Member + roles dinâmicas) — ainda
> nenhuma tela de domínio de negócio. O conteúdo abaixo descreve o
> **objetivo e o escopo** do produto para orientar as propostas de mudança
> feitas via [OpenSpec](#openspec) antes da implementação.

## Contexto da empresa

A [Camu 3D](../camu-docs/README.md) é uma sociedade de 3 sócios que produz
e vende peças de papelaria/colecionáveis impressas em 3D, com modelo de
negócio evoluindo em fases:

1. **Marketplace** (Mercado Livre, Shopee, TikTok Shop, ...) — validação de
   catálogo e demanda.
2. **Site + backend de assinatura** — construído em paralelo, mas só aberto
   ao público quando o catálogo autoral estiver maduro.
3. **Pré-venda** de lotes com item exclusivo.
4. **Assinatura recorrente** — planos com carimbo/fidelidade e produção
   mensal por categoria.

O `camu-web-admin` é a ferramenta interna que dá suporte a essa operação
**por trás** do site voltado ao cliente final — não é a loja em si, é o
painel de gestão usado pelos sócios/funcionários.

## Objetivo do produto

Centralizar em um único painel web tudo que hoje é feito de forma manual
ou fragmentada (planilhas, WhatsApp, exports de marketplace), reduzindo o
risco de erro de gestão identificado na documentação de planejamento da
empresa — especialmente má gestão financeira, estouro do teto do MEI, e
falta de visibilidade sobre capacidade de produção.

## Funcionalidades previstas

### Financeiro

- Registro de vendas (manual ou importado de marketplace), com custo
  estimado x real por peça e margem.
- Fluxo de caixa da conta PJ (entradas/saídas) e conciliação de saldo.
- Reserva de imposto (DAS/Simples) e alerta quando a reserva ficar abaixo
  do esperado.
- Fechamento mensal (faturamento, custo, imposto, lucro líquido e divisão
  entre sócios).
- Alerta de faturamento acumulado (12 meses) x teto do MEI, para antecipar
  o gatilho de migração para ME.
- Repositório/organização de documentos fiscais (notas fiscais, recibos,
  comprovantes de PIX de aporte/retirada, extratos bancários, guias de
  imposto).

### Produção e catálogo

- Cadastro do catálogo autoral por categoria (miniaturas/colecionáveis,
  personalizados, utilitários, linha Leon) e porte (P/M/G).
- Acompanhamento do parque de impressoras (Ender-3 V3 SE, Creality K1 Max,
  Bambu Lab A1 Combo) e throughput real por máquina.
- Fila/painel de produção: cruzamento de pedidos (marketplace, pré-venda,
  assinatura) com capacidade disponível, para gerar a lista de impressão.
- Comparação de custo/tempo estimado x real por peça, com alerta de desvio
  (>15%) para reprecificação.

### Vendas e canais

- Consolidação de vendas por canal (Mercado Livre, Shopee, TikTok Shop,
  Amazon, SHEIN, etc.) e por categoria de produto.
- Suporte à pré-venda por lote (inscrições, prazo, política de
  atraso/reembolso).
- Base para o catálogo/carrinho de venda direta do site público.

### Assinatura recorrente

- Modelo de planos (básico/plus), ciclo de cobrança e mecânica de
  carimbo/fidelidade.
- Integração com gateway de pagamento recorrente (Asaas, Iugu ou
  Pagar.me).
- Geração da fila de produção mensal por assinante/categoria.

### Societário e governança

- Registro do acordo entre sócios (divisão de responsabilidades, divisão
  de lucro, regras de saída de sócio).
- Acompanhamento do enquadramento societário (MEI x ME) e dos gatilhos de
  migração.
- Log de decisões relevantes do negócio (histórico estilo ADR).

## Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou
  outro daemon Docker) rodando — o Supabase local sobe Postgres, Auth e
  Studio como containers
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  (já incluída como devDependency; os scripts abaixo usam `npx`/`npm run`,
  não é obrigatório instalar globalmente)

### Passo a passo

```bash
npm install
cp .env.example .env.local

# Sobe Postgres + Auth + Studio locais via Docker.
# Ao final, o comando imprime a API URL, anon key e service_role key locais.
npm run supabase:start

# Copie as 3 chaves impressas acima para .env.local:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY

# Aplica todas as migrations em supabase/migrations/ do zero.
npm run supabase:reset

npm run dev
```

O app fica disponível em `http://localhost:3000`. O Supabase Studio local
(gerenciar tabelas, ver usuários de Auth, etc.) fica em
`http://127.0.0.1:54323` por padrão.

Para parar os containers: `npm run supabase:stop`.

### Usuário Owner padrão (seed local)

Não há cadastro público nem UI de convite neste estágio. Para não depender
de criação manual, `supabase/seed.sql` cria um usuário Owner padrão
automaticamente toda vez que as migrations são reaplicadas do zero
(`npm run supabase:reset`, `make dev` na 1a vez, ou `make db-reset`) —
**apenas no ambiente local**, esse arquivo não roda em produção.

```
E-mail: owner@camu.local
Senha:  owner123456
```

Faça login com essas credenciais em `http://localhost:3000/login` — o
Owner tem bypass total de RLS e pode gerenciar roles, sub-roles e usuários
a partir das telas em `/admin/roles` e `/admin/usuarios`.

### Seed de roles e usuários de exemplo (opcional, ambiente local)

`npm run seed-roles` popula o banco com as 7 roles e a divisão sócio→área
hoje documentadas em `camu-docs/01-visao-geral/sociedade-e-divisao.md`
(Produção, Marketplace/Vendas, Site, Assinatura, Infra/Automação,
Financeiro, Societário), além de 3 usuários de exemplo:

```
socio-a@camu.local / socio123456  → Produção, Marketplace/Vendas
socio-b@camu.local / socio123456  → Site, Assinatura, Infra/Automação
socio-c@camu.local / socio123456  → sem role própria (gap documentado)
```

É **idempotente** (roda de novo sem duplicar nada) e usa a mesma camada de
services/repositórios da aplicação — não é SQL solto. Requer o Supabase
local rodando (`npm run supabase:start`) e `.env.local` preenchido.

**Uso recomendado apenas em ambiente local.** A divisão sócio→área aplicada
é provisória (o próprio comando avisa isso ao final) e deve ser revisada
pelo Owner via UI; e-mails `@camu.local` fictícios podem confundir se
rodados sem atenção em um ambiente compartilhado.

### Seed de parâmetros de precificação (opcional, ambiente local)

`npm run seed-pricing` popula os valores de referência do motor de cálculo
de preço, hoje documentados em `camu-docs/03-financeiro/custo-por-peca.md`,
`camu-docs/03-financeiro/roadmap-impressoras.md` e
`camu-docs/06-marketplace/estrategia-canais.md`: 1 registro de parâmetros de
custo (filamento, energia, consumo, reserva de falha, embalagem), a
impressora Ender-3 V3 SE, as faixas de porte P/M/G e as taxas dos 5 canais
de marketplace (Mercado Livre com o percentual confirmado; os demais como
placeholder explícito de 0% até validação no seller center de cada
plataforma).

É **idempotente** (cada tabela é versionada por vigência, mas o script só
insere se ainda não houver um registro/faixa/canal vigente) e usa a mesma
camada de services/repositórios da aplicação. Requer o Supabase local
rodando (`npm run supabase:start`) e `.env.local` preenchido.

**Uso recomendado apenas em ambiente local.** Os valores são as premissas
citadas no `camu-docs` (explicitamente marcadas lá como "a validar") e devem
ser revisados pelo Owner/Sócio antes de qualquer uso em produção.

## Fora de escopo (por enquanto)

- A loja/site voltado ao cliente final (catálogo público, carrinho,
  checkout) — este repositório é o **painel interno**, não a vitrine.
- Automação de atendimento ao cliente (WhatBot) — pode vir a se integrar,
  mas não é implementada aqui.

## OpenSpec

Este repositório usa o fluxo [OpenSpec](openspec/config.yaml) para
desenvolvimento orientado a especificação: mudanças relevantes são
propostas, especificadas e revisadas antes da implementação. Ver os
comandos disponíveis em `.claude/commands/opsx/`.

## Convenção de commits

Commits seguem Conventional Commits com o pacote/área afetada entre
parênteses:

```
Feat(financeiro): adiciona tela de fechamento mensal
Fix(producao): corrige cálculo de throughput por máquina
Chore(openspec): atualiza config do projeto
```

Tipos comuns: `Feat`, `Fix`, `Refactor`, `Chore`, `Docs`, `Test`.
