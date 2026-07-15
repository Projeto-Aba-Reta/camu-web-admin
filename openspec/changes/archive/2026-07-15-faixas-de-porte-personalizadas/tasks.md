## 1. Banco de dados

- [x] 1.1 Criar migration `supabase/migrations/<timestamp>_portes_personalizados.sql`: tabela `size_tiers` (`code` text PK, `label` text not null, `sort_order` integer not null, `is_system` boolean not null default false, `created_by`, `created_at`), com `comment on table`/colunas explicando código estável × nome editável × ordem × porte de sistema
- [x] 1.2 Na mesma migration, inserir P/M/G como portes de sistema (`is_system = true`) com nome ("Pequena", "Média", "Grande") e ordem (10/20/30, com folga para intercalar)
- [x] 1.3 Remover os dois `CHECK (... in ('P','M','G'))` de `size_tier_ranges.tier` e `products.size_tier`; adicionar FK `size_tier_ranges.tier → size_tiers.code` (todos os valores existentes são portes válidos); NÃO criar FK a partir de `products.size_tier` (nullable/legada — integridade garantida no serviço)
- [x] 1.4 RLS de `size_tiers`: leitura Owner/Sócio/Financeiro/Produção; escrita Owner/Sócio/Financeiro (mesma regra de `size_tier_ranges`). Trigger/policy que impeça delete de `is_system = true`
- [x] 1.5 Atualizar `src/lib/supabase/database.types.ts` com a tabela `size_tiers` e a remoção dos CHECK
- [x] 1.6 Atualizar `supabase/seed-hosted.sql` e `scripts/seed-pricing.ts` para registrar P/M/G em `size_tiers` (idempotente) antes de inserir faixas

## 2. Tipos e validação

- [x] 2.1 Em `src/types/pricing.ts`: `SizeTier` deixa de ser `"P" | "M" | "G"` e passa a `string` (alias semântico de código de porte); adicionar `SizeTierDefinition { code, label, sortOrder, isSystem, createdBy, createdAt }`
- [x] 2.2 Em `src/lib/validation/pricing-schemas.ts`: substituir o enum fixo `SIZE_TIERS` por validação de código de porte (`^[A-Z0-9]{1,4}$`, normalizado, rejeitando `/`), com comentário apontando para o separador de ambiguidade em `suggested_tier`; novo `sizeTierFormSchema` (código, nome, ordem)
- [x] 2.3 Ajustar `simuladorFormSchema`/`sizeTierRangeFormSchema` para o porte ser um código validado contra os portes cadastrados (não mais enum P/M/G)

## 3. Motor de cálculo e classificação

- [x] 3.1 Em `src/lib/services/pricing-formula.ts`: remover `TIER_ORDER`; `classifyTier` passa a derivar a ordem dos portes a partir da `sortOrder` das definições recebidas (ou de um parâmetro de portes ordenados), produzindo candidatos determinísticos e desempate de ambiguidade por essa ordem, com desempate secundário estável por código
- [x] 3.2 Em `src/lib/services/pricing-service.ts`: carregar as definições de porte (`size_tiers`) junto dos demais parâmetros e passá-las à classificação; garantir que portes sem faixa vigente simplesmente não participem da classificação automática
- [x] 3.3 Em `src/lib/repositories/supabase/supabase-price-calculation-repository.ts`: manter a serialização de `suggested_tier` por `/`, adicionando comentário de que ela depende de o código de porte nunca conter `/` (garantido pela validação em 2.2)

## 4. Repositórios e Server Actions

- [x] 4.1 Criar interface `ISizeTierRepository` e a implementação Supabase (`findAll` ordenado por `sort_order`, `create`, `update` de nome/ordem, `remove` com verificação de referências, bloqueio de `is_system`)
- [x] 4.2 Registrar o novo repositório em `src/lib/repositories/index.ts`
- [x] 4.3 Ajustar `supabase-size-tier-range-repository.ts` para juntar o nome/ordem do porte (via `size_tiers`) ao devolver faixas, sem assumir P/M/G
- [x] 4.4 Ajustar `supabase-product-repository.ts` para validar/gravar `size_tier` como código livre (sem enum P/M/G), validando contra portes cadastrados na escrita
- [x] 4.5 Em `src/app/(dashboard)/financeiro/precificacao/actions.ts`: actions de cadastrar/editar/remover porte (com normalização do código, proteção de porte de sistema e verificação de referências na remoção)

## 5. UI — configuração de precificação

- [x] 5.1 Em `src/components/precificacao/size-tier-form.tsx`: seção de cadastro/edição de portes (código — bloqueado ao editar —, nome, ordem), com portes de sistema sem opção de remover nem editar código; escolher um porte existente para editar suas faixas/margens em vez do dropdown fixo P/M/G
- [x] 5.2 Exibir código e nome do porte nas tabelas de faixas vigentes e de histórico
- [x] 5.3 Em `src/app/(dashboard)/financeiro/precificacao/configuracao/page.tsx`: carregar as definições de porte e passá-las ao formulário e ao simulador
- [x] 5.4 Ajustar `pricing-draft-context.tsx` e `simulador-precificacao.tsx` para o rascunho/preview usarem código de porte dinâmico e resolverem o rótulo pelas definições, não pelo `Record` fixo

## 6. UI — rótulos de porte dinâmicos

- [x] 6.1 Criar um helper de rótulo de porte (`tierLabel(code, tiers)` ou `Map<code,label>`) e substituir os `Record<SizeTier,string>` fixos: `TIER_LABEL` em `resultado-calculo.tsx`, `simulador-precificacao.tsx`, `product-components-manager.tsx`, `calculo-form.tsx`; `SIZE_TIER_LABEL` em `components/catalogo/constants.ts`
- [x] 6.2 Passar as definições de porte às telas que hoje usam rótulo fixo (props de Server Component): catálogo (`product-list.tsx`), histórico de cálculos (`historico-tabela.tsx`), cálculo por peça e peça composta
- [x] 6.3 Fallback: quando um código não estiver no mapa, exibir o próprio código, evitando quebra de renderização
- [x] 6.4 No seletor de porte da peça composta e da resolução de ambiguidade, listar todos os portes cadastrados (não só P/M/G)

## 7. Testes

- [x] 7.1 Em `src/lib/services/pricing-service.test.ts`: classificação sobre lista dinâmica de portes ordenada por `sortOrder`, incluindo classificação num porte personalizado e ambiguidade entre um fixo e um personalizado
- [x] 7.2 Cobrir a validação do código: normalização (trim/upper), rejeição de `/`, rejeição de duplicado
- [x] 7.3 Cobrir a proteção de porte de sistema (não removível, código imutável) e a remoção de porte personalizado bloqueada quando há referências
- [x] 7.4 Ajustar os testes existentes que constroem `SizeTierRange`/`SizeTier` ou assumem P/M/G fixos (pricing e catálogo) para o modelo de portes cadastrados

## 8. Fechamento

- [x] 8.1 Rodar `npm run lint`, `npx tsc --noEmit` e a suíte de testes; corrigir o que quebrar
- [x] 8.2 Aplicar a migration no Supabase local e validar ponta a ponta: cadastrar um porte `GG`, configurar faixa/margem, classificar uma peça que caia nele, calcular e conferir o rótulo no resultado, no histórico e no catálogo; confirmar que P/M/G seguem intactos e não removíveis
- [x] 8.3 Commit seguindo Conventional Commits, ex.: `Feat(producao): portes de tamanho personalizados além de P/M/G`
