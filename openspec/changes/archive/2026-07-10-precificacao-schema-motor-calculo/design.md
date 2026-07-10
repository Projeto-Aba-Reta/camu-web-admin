## Context

`fundacao-schema-auth` já entrega `profiles`, `roles`, `sub_roles`, `user_roles`, `user_sub_roles` e as funções `is_owner()`, `is_socio_or_owner()`, `has_role(slug)`, `has_sub_role(slug)`. `fundacao-admin-roles-usuarios` popula (via seed) roles como "Financeiro" e "Produção" a partir da divisão sócio→área do `camu-docs`. Este change assume esse schema pronto e constrói por cima dele.

A fórmula e os valores de referência vêm inteiramente de `camu-docs/03-financeiro/custo-por-peca.md`, `06-marketplace/estrategia-canais.md` e `03-financeiro/roadmap-impressoras.md` — todos marcados no `camu-docs` como "premissas a validar" (tempo real de impressão, taxa de falha real, custo de energia real variam por região/peça). O schema precisa tratar esses números como **configuração editável com histórico**, nunca como constantes de código, porque a Fase 0-1 do negócio explicitamente espera revisá-los.

## Goals / Non-Goals

**Goals:**
- Persistir parâmetros de custo, parque de impressoras e taxas de canal como dados versionados no tempo (nunca sobrescrever — sempre nova linha com vigência).
- Motor de cálculo puro (sem estado, testável) que recebe peso/tempo/impressora e devolve custo, porte sugerido e preço/margem por canal ativo.
- Preservar histórico de cada cálculo executado, para permitir auditoria futura (comparar cálculo antigo com parâmetro vigente na época).
- RLS alinhado ao modelo já existente: Owner/Sócio sempre; Financeiro/Produção para leitura e ajuste dos parâmetros que lhes cabem.

**Non-Goals:**
- Nenhuma tela — schema e services apenas (UI em `precificacao-telas`).
- Nenhum vínculo com uma peça de catálogo real (não existe ainda — `catalogo-schema` é quem referencia `price_calculations`).
- Comparação automática custo estimado x custo real por peça (depende de dados de produção que ainda não existem — candidato a change futuro em Estoque/Produção).
- Integração com o fatiador (Bambu Studio/Orca/Cura) para ler peso/tempo automaticamente — os inputs são digitados manualmente na UI do change seguinte; importação automática fica registrada como Open Question.

## Decisions

### 1. Parâmetros versionados por vigência, não por update in-place
Cada parâmetro de custo (`cost_parameters`), taxa de canal (`channel_fees`) e depreciação de impressora (`printers`, campo `depreciation_per_hour` histórico via `printer_depreciation_history`) é inserido como nova linha com `valid_from timestamptz`, nunca `UPDATE`. O motor de cálculo sempre lê o parâmetro com `valid_from` mais recente ≤ `now()`. **Alternativa considerada**: `UPDATE` direto na linha do parâmetro. Rejeitada porque `custo-por-peca.md` pede comparar custo real x estimado ao longo do tempo, e o log de decisões do `camu-docs` já segue esse mesmo princípio (nunca reescrever, só adicionar entrada nova) — manter o paralelo facilita auditoria e é consistente com o "Sinais de alerta" de `controle-financeiro.md` (desvio >15% do estimado).

### 2. Tabelas
- `cost_parameters`: `id uuid PK`, `filament_cost_per_kg numeric`, `energy_cost_per_kwh numeric`, `average_power_watts numeric`, `failure_reserve_pct numeric`, `packaging_cost numeric`, `valid_from timestamptz default now()`, `created_by references profiles(id)`. Sempre 1 linha "vigente" (a de `valid_from` mais recente); nunca deletada.
- `printers`: `id uuid PK`, `name`, `model`, `depreciation_per_hour numeric`, `is_active boolean default true`, `valid_from timestamptz default now()`, `created_by references profiles(id)`. Trocar a depreciação de uma máquina insere nova linha com o mesmo `model`/`name`, não edita a existente — usa `(name, valid_from)` para achar a vigente.
- `channel_fees`: `id uuid PK`, `channel text` (`mercado_livre`, `shopee`, `tiktok_shop`, `amazon`, `shein` — CHECK constraint, sem tabela de canais separada por ora, já que a lista vem fechada de `estrategia-canais.md`), `percentage_fee numeric`, `fixed_fee numeric default 0`, `valid_from timestamptz default now()`, `created_by references profiles(id)`.
- `size_tier_ranges`: `id uuid PK`, `tier text CHECK (tier in ('P','M','G'))`, `min_weight_grams numeric`, `max_weight_grams numeric`, `min_print_hours numeric`, `max_print_hours numeric`, `valid_from timestamptz default now()`. Faixas de referência de `custo-por-peca.md` (P ~15g/~2,1h, M ~35g/~4,2h, G ~80g/~8,4h) — carregadas como seed inicial editável, não como constante hardcoded.
- `price_calculations`: `id uuid PK`, `weight_grams numeric`, `print_hours numeric`, `printer_id references printers(id)`, `cost_parameters_id references cost_parameters(id)` (snapshot de qual vigência foi usada), `suggested_tier text`, `total_cost numeric`, `cost_breakdown jsonb` (filamento/energia/depreciação/reserva/embalagem individualizados), `channel_prices jsonb` (array `{channel, suggested_price, margin}` por canal ativo), `created_by references profiles(id)`, `created_at timestamptz default now()`. Guarda o resultado completo do cálculo — nunca recalculado silenciosamente depois, para preservar o que foi mostrado ao usuário no momento.

### 3. Motor de cálculo como função pura em `pricing-service.ts`
`calculatePrice({ weightGrams, printHours, printerId }): PriceCalculationResult` — busca os parâmetros vigentes (via repositórios), aplica a fórmula, classifica o porte por `size_tier_ranges`, projeta preço por canal (`custo ÷ (1 - percentage_fee) + fixed_fee`, arredondado à faixa sugerida) e devolve o resultado sem persistir. Um método separado `calculateAndSavePrice(...)` persiste em `price_calculations`. Separar cálculo puro de persistência facilita testar a fórmula isoladamente e reutilizá-la depois em `catalogo-schema` sem duplicar lógica. **Alternativa considerada**: fórmula embutida direto na Server Action da UI. Rejeitada porque o motor precisa ser reusado por `catalogo-schema` (recalcular preço ao editar peso/tempo de uma peça do catálogo) sem depender de código de UI.

### 4. RLS: Owner/Sócio + roles de domínio
Policies usam `is_socio_or_owner() OR has_role('financeiro') OR has_role('producao')` para leitura de todas as tabelas deste change. Escrita (ajustar parâmetros, cadastrar impressora) fica restrita a `is_socio_or_owner() OR has_role('financeiro')` — Produção consulta mas não altera parâmetros financeiros; cadastro de impressora (parque físico) é liberado também para `has_role('producao')` já que é uma decisão operacional, não financeira. `price_calculations` segue a regra de leitura ampla (Financeiro + Produção) e escrita por quem executa o cálculo (qualquer usuário autenticado com pelo menos uma dessas duas roles, registrado em `created_by`). **Trade-off aceito**: exige que os slugs `financeiro` e `producao` já existam como roles reais no banco (dependência de dado, não só de schema) — se o seed de `fundacao-admin-roles-usuarios` usar slugs diferentes, as policies deste change quebram silenciosamente (ver Risks).

### 5. Sem tabela `channels` separada por ora
A lista de canais é fechada e pequena (5 valores, ver `estrategia-canais.md`) e muda por decisão de negócio (log de decisões), não por cadastro frequente de usuário — um `CHECK constraint` é suficiente e evita uma tabela de referência para 5 valores estáveis. **Revisitar** se a Fase de Vendas/Canais (fora do escopo deste roadmap de 4 fases) precisar de metadados adicionais por canal (ex.: URL da loja, credenciais de API).

## Risks / Trade-offs

- **[Risco]** Policies de RLS dependem dos slugs exatos `financeiro` e `producao` existirem em `roles.slug` — se o seed de `fundacao-admin-roles-usuarios` usar nomes diferentes (ex.: `financas`), a policy nunca casa e ninguém além de Owner/Sócio consegue ler. → **Mitigação**: task de verificação explícita neste change confirma os slugs reais no banco antes de escrever as migrations de policy; documentar os slugs esperados como pré-requisito no `tasks.md`.
- **[Risco]** Parâmetros versionados por `valid_from` sem tabela de canais própria tornam a query "parâmetro vigente" um `ORDER BY valid_from DESC LIMIT 1` repetido em várias tabelas — se o volume de histórico crescer muito (improvável neste estágio, mas possível anos depois), pode exigir índice/view materializada. → **Mitigação**: criar índice `(valid_from desc)` por tabela desde já; registrado como não-problema na escala atual (dezenas de linhas/ano).
- **[Risco]** `channel_fees` com canal como `CHECK constraint` fechado exige uma migration nova sempre que um canal for adicionado/removido (ex.: entrada de um novo marketplace). → **Mitigação**: aceito conscientemente — mudar o conjunto de canais é uma decisão de negócio rara (ver `estrategia-canais.md`), não uma operação de usuário; se a frequência aumentar, revisitar para tabela `channels` própria.
- **[Risco]** `cost_breakdown`/`channel_prices` como `jsonb` sacrificam validação estrutural no banco em troca de flexibilidade. → **Mitigação**: a validação de forma (shape) acontece na camada de service/TypeScript (tipo `PriceCalculationResult` compartilhado), que é o único ponto que escreve nesses campos.

## Migration Plan

1. `supabase/migrations/<timestamp>_precificacao_parametros_e_motor.sql`: cria `cost_parameters`, `printers`, `channel_fees`, `size_tier_ranges`, `price_calculations`, RLS e policies.
2. Seed inicial (via `db/seed` local, não hardcoded no motor) dos valores de referência do `camu-docs`: 1 linha em `cost_parameters` (filamento R$90/kg, energia R$0,80/kWh, consumo 150W, reserva 12,5% — ponto médio de "10-15%" citado no doc, embalagem a definir com o Owner), 1 linha em `printers` (Ender-3 V3 SE, depreciação R$0,80/h), 3 linhas em `size_tier_ranges` (P/M/G), e 5 linhas em `channel_fees` (Mercado Livre ~14% efetivo já líquido conforme a tabela de preço sugerido do doc — confirmar percentual bruto real com o Owner antes de aplicar; demais canais com placeholder explícito a revisar).
3. Aplicar local via `supabase db reset`; em ambientes hospedados via `supabase db push` antes do deploy.
4. Rollback: sem dado de produção dependente ainda (schema novo) — `drop table` das 5 tabelas em caso de erro é seguro nesta fase.

## Open Questions

- Importação automática de peso/tempo direto de um arquivo de fatiador (`.gcode`/`.3mf`) em vez de digitação manual: registrado como melhoria futura, não neste change — a UI do change seguinte assume input manual.
- Custo de embalagem: `custo-por-peca.md` não fixa um valor de referência explícito (só cita "embalagem" na fórmula) — o valor exato do seed precisa ser confirmado com o Owner/Sócio antes de aplicar em produção; ver task de verificação.
- Percentual real do Mercado Livre: a tabela de `custo-por-peca.md` já desconta ~14% no preço sugerido, mas não deixa claro se é a taxa bruta da categoria ou um número líquido pós outras deduções — confirmar antes do seed de `channel_fees` para não duplicar o desconto na hora de sugerir preço.
