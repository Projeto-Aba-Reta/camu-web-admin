## Context

O porte de uma peça hoje é um enum fechado, cravado em três lugares que precisam concordar:

- **Tipo**: `SizeTier = "P" | "M" | "G"` (`src/types/pricing.ts`), importado em ~23 arquivos.
- **Banco**: `CHECK (tier in ('P','M','G'))` em `size_tier_ranges.tier` e `CHECK (size_tier in ('P','M','G'))` em `products.size_tier`.
- **Lógica**: `TIER_ORDER: SizeTier[] = ["P","M","G"]` em `pricing-formula.ts`, usado por `classifyTier` para ordenar candidatos de forma determinística e para desempatar ambiguidade.

Além disso, o rótulo do porte é um `Record<SizeTier, string>` fixo, repetido em vários componentes (`TIER_LABEL` em `size-tier-form`, `resultado-calculo`, `product-components-manager`, `simulador-precificacao`; `SIZE_TIER_LABEL` em `components/catalogo/constants.ts`). E a ambiguidade é serializada em `price_calculations.suggested_tier` como os candidatos juntados por `/` (ex.: `"P/G"`).

O que já existe e ajuda: `size_tier_ranges` já é a tabela versionada por `valid_from` que guarda, por porte, a faixa de peso/tempo e — desde a mudança `margem-por-porte-e-simulador-de-precificacao` — as margens B2C/B2B com seus modos. Ou seja, "cadastrar uma faixa de porte" já é um fluxo existente que cria uma linha `size_tier_ranges`.

Restrições a respeitar:

- **P/M/G continuam existindo** (decisão do usuário): são portes de sistema, sempre presentes, e o usuário adiciona portes **além** deles.
- **Peças e cálculos já salvos guardam o código do porte** e não podem ser invalidados: remover P/M/G ou trocar seu código quebraria referências históricas.
- **`price_calculations` é snapshot imutável**: nada de recálculo.
- Formulário em código/nome; o motor continua indiferente ao rótulo (opera sobre o código).

## Goals / Non-Goals

**Goals:**

- Cadastrar portes personalizados além de P/M/G, cada um com código estável, nome de exibição editável e ordem explícita na régua de tamanho.
- P/M/G protegidos: não removíveis, código imutável; nome/faixa/margem editáveis como qualquer outro.
- Classificação automática e ambiguidade operando sobre a lista dinâmica de portes, ordenada pela ordem cadastrada.
- Rótulo de porte resolvido a partir dos portes cadastrados, em qualquer tela, sem `Record` fixo.
- Zero migração de dados de negócio: P/M/G existentes viram registros de sistema; peças/cálculos continuam válidos.

**Non-Goals:**

- Deletar/mesclar portes com peças já associadas (só se cogita bloquear a remoção; merge de portes é outra história).
- Reclassificar automaticamente peças já cadastradas quando um porte novo é criado.
- Porte por categoria de peça, ou faixas de porte específicas por impressora.
- Internacionalização do nome de exibição.

## Decisions

### Decisão 1 — Registro de portes numa tabela nova `size_tiers`, referenciada pelo código

Uma tabela nova, não versionada:

```sql
create table public.size_tiers (
  code       text primary key,          -- estável; o que peças/cálculos guardam
  label      text not null,             -- nome de exibição, editável
  sort_order integer not null,          -- posição na régua de tamanho
  is_system  boolean not null default false,  -- P/M/G = true
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
```

`size_tier_ranges.tier` e `products.size_tier` continuam guardando o **código** como texto (as duas CHECK `in ('P','M','G')` são removidas). Poderiam virar FK para `size_tiers.code`; o design **não** cria FK a partir de `products.size_tier` porque essa coluna é nullable e legada e uma FK exigiria backfill/validação retroativa — a integridade do código é garantida na camada de serviço na escrita, como já se faz para composição de peça. `size_tier_ranges.tier` **pode** virar FK (todos os seus valores são portes válidos), o que também barra cadastrar faixa para um porte inexistente.

**Por que tabela separada, e não só colunas `label`/`sort_order` em `size_tier_ranges`**: `size_tier_ranges` é versionada — cada alteração de faixa/margem cria uma linha nova. O nome e a ordem de um porte são atributos do **porte**, não da vigência de suas faixas; guardá-los na tabela versionada duplicaria o nome em cada versão e criaria a pergunta "qual nome vale?". A identidade e o rótulo do porte vivem uma vez, em `size_tiers`; a faixa/margem versionada continua em `size_tier_ranges`.

**Alternativa rejeitada — inferir os portes do conjunto distinto de `size_tier_ranges.tier`**: é como o sistema "sabe" hoje quais portes existem. Mas não há onde pendurar nome nem ordem, e um porte só passaria a existir depois de ter faixa cadastrada — o que impede criar o porte e depois configurar sua faixa. A tabela separada desacopla "existe o porte" de "a faixa dele está configurada".

### Decisão 2 — `SizeTier` vira `string`; ordem e rótulo passam a ser dados, não código

`SizeTier = string` (um alias semântico, mantido para as assinaturas continuarem legíveis). Some `TIER_ORDER`. `classifyTier` passa a receber os portes já ordenados (a lista de `size_tier_ranges` vigentes, ordenada pela `sort_order` do `size_tiers` correspondente) e usa essa ordem para produzir candidatos determinísticos e desempatar ambiguidade — exatamente o papel que `TIER_ORDER` tinha, agora vindo do dado.

Os `Record<SizeTier, string>` de rótulo dão lugar a uma resolução por lookup: um `Map<code, label>` (ou helper `tierLabel(code, tiers)`) construído a partir dos portes cadastrados, passado às telas como os outros dados de precificação já são (props de Server Component). Onde hoje há `TIER_LABEL[tier]`, passa a haver o lookup, com fallback para o próprio código quando o porte não for encontrado (peça histórica cujo porte foi... — não ocorre, já que portes não somem, mas o fallback evita quebra de renderização).

**Alternativa rejeitada — manter `SizeTier` como união e gerar o tipo**: impossível sem codegen a cada cadastro; o conjunto passa a ser dado de runtime, então o tipo estático certo é `string`.

### Decisão 3 — Portes de sistema (P/M/G) protegidos na escrita

`is_system = true` para P/M/G. Regras, aplicadas na camada de serviço e reforçadas por policy/trigger onde couber:

- **Remoção**: nenhum porte é removível se houver peça ou faixa que o referencia; portes de sistema nunca são removíveis, mesmo sem referências.
- **Código imutável**: o `code` é PK e nunca é alterado (a UI não oferece edição de código; renomear é mexer no `label`).
- **Nome/ordem/faixa/margem**: editáveis para todos, inclusive os de sistema.

Isso preserva o requisito "P/M/G continuam existindo" sem congelar suas faixas/margens/nome.

### Decisão 4 — Código do porte: curto, normalizado, sem `/`

O código é validado como 1–4 caracteres alfanuméricos maiúsculos (`^[A-Z0-9]{1,4}$`), normalizado no cadastro (trim + upper). Isso mantém o código legível como rótulo curto e — de propósito — **exclui `/`**, que é o separador usado ao serializar ambiguidade em `suggested_tier` (`"P/G"`). Assim a serialização atual continua válida sem virar JSON: candidatos juntados por `/` continuam desambiguáveis porque nenhum código contém `/`. O design registra essa dependência explicitamente para que ninguém "libere" `/` no código sem trocar o separador.

**Alternativa considerada — serializar `suggested_tier` como JSON array**: mais robusto, mas mexe num campo de snapshot já gravado e exigiria ler os dois formatos. Restringir o código evita o problema na origem, ao custo de uma regra de formato — aceitável.

### Decisão 5 — Novo porte não reclassifica nem exige faixa imediata

Criar um porte só o torna disponível; ele não passa a capturar peças automaticamente nem exige faixa de peso/tempo no mesmo instante. Um porte sem faixa vigente simplesmente não participa da classificação automática (não há intervalo a casar) até que sua faixa seja cadastrada — o que é coerente com `classifyTier`, que já ignora portes sem faixa. O porte pode, porém, ser escolhido manualmente (peça composta, resolução de ambiguidade) assim que existe.

## Risks / Trade-offs

- **`SizeTier = string` afrouxa o tipo** → um código inválido deixa de ser erro de compilação. Mitigação: validação de formato na fronteira (Zod + normalização) e, para `size_tier_ranges`, FK para `size_tiers`; a escrita de `products.size_tier` valida o código contra os portes cadastrados no serviço.
- **Rótulos deixam de ser resolvíveis sem os portes carregados** → uma tela que renderiza um porte precisa receber o mapa de rótulos. Mitigação: os portes são poucos e já há o padrão de passar dados de precificação como props de Server Component; o fallback para o código evita tela quebrada se algum caminho esquecer de passar o mapa.
- **Ordem por `sort_order` pode colidir** (dois portes com a mesma ordem) → a classificação fica não-determinística entre eles. Mitigação: desempate estável secundário (por `code`) e, na UI, sugerir a próxima ordem livre ao cadastrar.
- **Remover o CHECK do banco tira uma rede de segurança** → dados sujos poderiam entrar por fora do app. Mitigação: FK em `size_tier_ranges.tier`; a validação de `products.size_tier` no serviço; o formato do código no schema.
- **Dependência oculta código↔separador de ambiguidade** (Decisão 4) → alguém pode liberar `/` no futuro sem perceber. Mitigação: comentário no ponto de serialização e no schema de validação apontando um para o outro, e um teste que rejeita `/` no código.

## Migration Plan

1. Migration `supabase/migrations/<timestamp>_portes_personalizados.sql`: cria `size_tiers`; insere P/M/G como `is_system = true` com nome e ordem (P=10, M=20, G=30, deixando folga para intercalar); remove os dois `CHECK (... in ('P','M','G'))`; adiciona a FK `size_tier_ranges.tier → size_tiers.code`. RLS de `size_tiers`: leitura ampla (mesma dos parâmetros de precificação), escrita Owner/Sócio/Financeiro.
2. Deploy do código. P/M/G seguem funcionando idênticos; a única diferença visível é o cadastro de portes na tela de configuração.
3. Financeiro cadastra os portes personalizados que precisar e configura faixa/margem de cada um.

**Rollback**: reverter o app é seguro enquanto nenhum porte personalizado tiver sido criado (o código antigo só conhece P/M/G). Se um porte custom já existir e o app for revertido, peças/cálculos que o referenciem exibiriam o código cru (o `Record` fixo antigo não teria o rótulo) e o CHECK reintroduzido por um rollback de banco rejeitaria novas escritas desse porte — por isso o rollback de banco não deve recriar o CHECK enquanto houver portes custom.

## Open Questions

- Um porte personalizado deveria poder ser **desativado** (esconder de novos cadastros sem removê-lo, preservando o histórico), à semelhança de impressora ativa/inativa? Fora do escopo inicial; se aparecer, é uma flag `is_active` em `size_tiers`, sem impacto no motor.
- A ordem (`sort_order`) deveria ser derivada automaticamente da faixa de peso mínima, em vez de digitada? Deixado explícito por ora, porque peso e "tamanho percebido" nem sempre coincidem (uma peça oca grande pesa pouco) — a mesma razão pela qual o porte da peça composta é escolhido, não somado.
