## Context

`precificacao-schema-motor-calculo` já modela `printers` e a reserva de falha de impressão como parâmetro de custo. `catalogo-schema` já modela `products`. Nenhum dos dois rastreia quantidade física — nem de insumo (quanto filamento resta) nem de peça pronta (quantas unidades de uma peça já foram produzidas e estão disponíveis para venda). O `camu-docs` não documenta controle de estoque físico hoje; este change preenche essa lacuna operacional, seguindo o mesmo princípio de dado append-only já estabelecido nos changes anteriores (parâmetros de precificação, log de decisões do `camu-docs`).

## Goals / Non-Goals

**Goals:**
- Saldo de estoque (insumo e peça pronta) sempre derivado de um log de movimentações — nunca um campo mutável direto, para preservar auditoria completa de entradas/saídas.
- Alerta de estoque baixo configurável por insumo, sem hardcodar limites.
- Vínculo opcional entre saída de insumo (consumo em produção) e entrada de peça pronta, refletindo o processo real (imprimir consome filamento e gera peça).

**Non-Goals:**
- Fila de produção ou planejamento de produção futura (é sobre o passado/presente do estoque, não previsão).
- Baixa automática de peça pronta por venda de marketplace — não há integração de canal de venda neste roadmap de 4 fases; a saída por venda é registrada manualmente nesta primeira versão.
- Rastreamento de lote/validade de filamento (não é um insumo perecível relevante neste estágio).
- Cálculo de custo médio ponderado de estoque (FIFO/média móvel) — o custo de referência do insumo é o de `materials.reference_cost`, não recalculado por movimentação.

## Decisions

### 1. Saldo sempre derivado, nunca armazenado como campo mutável
Nem `materials` nem `products` ganham uma coluna `current_stock` editável diretamente — o saldo é sempre `SUM(quantity)` das movimentações (entradas positivas, saídas negativas) da tabela correspondente, exposto por uma view (`material_stock_balances`, `product_stock_balances`) ou por uma função `STABLE`. **Alternativa considerada**: manter um campo de saldo atualizado por trigger a cada movimentação (mais rápido de ler). Rejeitada nesta fase porque o volume de dados é baixo (operação artesanal, dezenas de movimentações por semana) e a leitura derivada elimina qualquer risco de saldo dessincronizado por bug de trigger — se a performance se tornar um problema real, a view pode virar materializada sem mudar o contrato da capability.

### 2. `materials` com custo de referência próprio, não substituindo `cost_parameters`
`materials.reference_cost` (R$/unidade) é informativo para o valor de estoque (quanto vale o insumo parado), independente do `filament_cost_per_kg` vigente em `cost_parameters` (usado no motor de cálculo de preço). Um rolo de filamento de cor especial pode custar diferente do genérico usado na fórmula de precificação padrão. **Alternativa considerada**: um único parâmetro de custo de filamento compartilhado entre precificação e estoque. Rejeitada porque acoplaria o motor de cálculo de preço (que assume um custo médio/genérico) ao custo real de compra de cada insumo específico, que varia por cor/fornecedor.

### 3. Tabelas de movimentação com `movement_type` fechado
`material_stock_movements`: `id`, `material_id references materials(id)`, `quantity numeric` (positivo para entrada, negativo para saída), `movement_type text CHECK (movement_type in ('compra','consumo_producao','perda_refugo','ajuste_manual'))`, `printer_id nullable references printers(id)` (quando `consumo_producao`), `product_id nullable references products(id)` (peça que consumiu o insumo, quando aplicável), `notes text`, `created_by`, `created_at`. `product_stock_movements`: `id`, `product_id references products(id)`, `quantity numeric`, `movement_type text CHECK (movement_type in ('producao','venda','perda','ajuste_manual'))`, `material_stock_movement_id nullable` (vínculo com a saída de insumo que originou esta produção), `notes`, `created_by`, `created_at`.

### 4. Vínculo opcional entre consumo de insumo e produção de peça
Ao registrar uma saída de insumo com `movement_type = 'consumo_producao'` e `product_id` preenchido, o service pode, na mesma operação transacional, criar a entrada correspondente em `product_stock_movements` (`movement_type = 'producao'`) referenciando a movimentação de insumo — mas isso é opcional (o usuário pode registrar consumo de insumo sem gerar peça pronta ainda, ex.: impressão em andamento) e implementado no service, não como trigger obrigatório de banco. **Alternativa considerada**: trigger de banco que sempre gera a entrada de peça pronta automaticamente. Rejeitada porque o consumo de insumo pode ocorrer antes da peça estar de fato pronta/aprovada (controle de qualidade), então acoplar as duas movimentações no banco criaria falsos positivos de "peça pronta" antes da hora.

### 5. Limite de estoque baixo por insumo, não por peça pronta
`material_stock_thresholds`: `id`, `material_id references materials(id) unique`, `minimum_quantity numeric`, `updated_by`, `updated_at`. Alerta de estoque baixo existe só para insumos (matéria-prima que pode faltar e travar produção) — peças prontas não têm alerta de mínimo nesta fase, já que a decisão de produzir mais é do usuário, não uma reposição automática. **Não-Goal explícito**: se no futuro a assinatura recorrente pedir um mínimo de peças prontas por categoria, isso é candidato a change futuro, fora deste roadmap de 4 fases.

### 6. RLS: leitura ampla, escrita restrita a Produção
Leitura de todas as tabelas: `is_socio_or_owner() OR has_role('producao') OR has_role('financeiro')`. Escrita (novas movimentações, configurar limite): `is_socio_or_owner() OR has_role('producao')` — Financeiro consulta valor de estoque (para fechamento mensal) mas não movimenta.

## Risks / Trade-offs

- **[Risco]** Saldo derivado por `SUM` a cada leitura pode ficar lento se o histórico de movimentações crescer muito ao longo dos anos. → **Mitigação**: aceito nesta escala; migrar para view materializada ou coluna cacheada é mudança de implementação, não de contrato da capability, se necessário depois.
- **[Risco]** Vínculo opcional (não obrigatório por trigger) entre consumo de insumo e produção de peça depende de disciplina do usuário para manter os dois lados coerentes. → **Mitigação**: a UI (`estoque-telas`) deve oferecer o fluxo combinado como padrão sugerido, mas o schema não impede registrar só um lado quando fizer sentido operacional.
- **[Risco]** Ausência de rastreamento de lote/fornecedor pode limitar análises futuras (ex.: comparar custo entre fornecedores do mesmo insumo). → **Mitigação**: fora de escopo consciente nesta fase; `materials` pode ganhar um campo de fornecedor depois sem quebrar o schema atual.

## Migration Plan

1. `supabase/migrations/<timestamp>_estoque_insumos_e_pecas_prontas.sql`: cria `materials`, `material_stock_movements`, `material_stock_thresholds`, `product_stock_movements`, as views/funções de saldo derivado, RLS e policies.
2. Seed inicial opcional (via `scripts/seed-inventory.ts`, idempotente): 1 material "Filamento PLA genérico" com o saldo inicial de 3kg citado em `investimento-inicial.md`, registrado como uma movimentação de `compra`.
3. Aplicar local via `supabase db reset`; hospedado via `supabase db push`.
4. Rollback: sem dado de produção dependente (tabelas novas) — `drop table`/`drop view` é seguro nesta fase.

## Open Questions

- Sugerir ao Owner/Sócio adicionar uma seção de controle de estoque físico no `camu-docs` (hoje `controle-financeiro.md` só cobre fluxo de caixa/imposto) — não bloqueia este change, mas fecha a lacuna de documentação identificada.
- Se/quando fornecedor e lote de insumo se tornarem relevantes (ex.: comparar custo entre fornecedores), avaliar campos adicionais em `materials` — não decidido aqui.
