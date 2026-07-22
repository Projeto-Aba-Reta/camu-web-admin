## Context

O schema atual (Supabase/Postgres) já tem as peças-chave para esta mudança, mas o motor não as usa por completo:

- `materials` — insumos (filamento/embalagem) com `reference_cost numeric` por `unit`. É o "estoque de insumos".
- `product_slicing_sheet_materials.material_id` **já** referencia `materials` (NOT NULL) — cada linha de ficha já aponta para um insumo. Porém o motor de cálculo hoje usa `cost_parameters.filament_cost_per_kg` (global), ignorando o `reference_cost` do insumo daquela linha.
- `products.product_type` ∈ (`simples`, `composta`); `product_components` (parent → component_product_id, quantity) modela a composição só por peças **vendáveis** do catálogo.
- `price_calculations` guarda snapshots: cálculo simples usa `weight_grams`/`print_hours`/`printer_id`; cálculo de composta usa `component_breakdown jsonb` (array de `{componentProductId, quantity, unitCost, totalCost}`). Um CHECK garante XOR entre os dois modos.

Faltam: (a) partes inline não vendáveis dentro de uma composta; (b) uso do `reference_cost` do insumo no custo de filamento; (c) custo de máquina por parte (impressora/tempo próprios).

## Goals / Non-Goals

**Goals:**
- Cadastrar N partes inline (não vendáveis) numa peça `composta`, cada uma com filamento (insumo), gramas, impressora e tempo próprios.
- Derivar o custo de filamento do `reference_cost` do insumo vinculado, com fallback ao `filament_cost_per_kg` global.
- Custo de máquina (energia + depreciação) por parte, somado; reserva de falha sobre o subtotal e embalagem contadas uma vez por conjunto.
- Suportar composta híbrida (partes inline + componentes do catálogo) no mesmo produto.
- Padronizar unidade de filamento em `kg`/`g` e o saldo em gramas, para que o custo por kg seja sempre resolvível e a baixa de estoque já existente na fila feche corretamente.
- Não quebrar `price_calculations` já salvos — tudo aditivo.

**Non-Goals:**
- Vender partes isoladamente ou expô-las no catálogo.
- Alterar as regras de margem por porte / B2B / faixas de volume (reaproveitadas como estão).
- Deduzir estoque de insumos a partir das partes inline pela fila de impressão: a fila continua operando por ficha de fatiamento; aqui a baixa por ficha só ganha consistência de unidade.
- Migrar cálculos antigos ou o modelo `product_components` existente.

## Decisions

### 1. Nova tabela `product_parts` para partes inline
```
product_parts (
  id uuid pk,
  product_id uuid not null references products(id) on delete cascade,  -- a composta pai
  name text not null,
  quantity int not null check (quantity > 0),
  material_id uuid references materials(id),        -- NULL => fallback global
  piece_grams numeric not null check (piece_grams >= 0),
  support_grams numeric not null default 0 check (support_grams >= 0),
  printer_id uuid not null references printers(id),
  print_hours numeric not null check (print_hours > 0),
  position int,                                     -- ordenação na UI
  created_at, updated_at
)
```
- `material_id` é opcional (parte pode não ter insumo → fallback global), diferente de `product_slicing_sheet_materials.material_id` que é NOT NULL.
- `on delete cascade` no pai: remover a composta remove suas partes; cálculos já salvos não dependem da linha (guardam snapshot). RLS igual a `product_components`/catálogo.

### 2. Custo por kg do insumo com fallback
Uma função de resolução `resolveFilamentCostPerKg(material_id?)`:
1. Se `material_id` presente e o insumo é filamento → converte `reference_cost` para R$/kg pela `unit` (`kg` direto, `g` ×1000) e usa esse valor.
2. Se `material_id` ausente (parte inline sem insumo vinculado) → `cost_parameters.filament_cost_per_kg` (global vigente).

Como a decisão 6 garante que todo filamento tem `unit ∈ {kg, g}`, a conversão é sempre resolvível quando há `material_id`; o fallback global fica reservado para partes inline sem insumo vinculado. O motor de ficha de fatiamento passa a chamar essa mesma função por linha de material (hoje usa só o global) — corrige a precificação de peças bicolores com cores de custo diferente.

### 3. Custo agregado por partes
Para peça `composta`, o custo total é:
```
custoParte = filamentoParte + energiaParte + depreciacaoParte + falhaParte   -- por unidade, SEM embalagem
filamentoParte    = piece_grams/1000 × resolveFilamentCostPerKg(material_id)  -- mesma base do peso derivado da ficha
energiaParte      = print_hours × (avg_watts/1000) × preco_kwh
depreciacaoParte  = print_hours × depreciacao_hora(printer_id)
falhaParte        = (filamentoParte + energiaParte + depreciacaoParte) × failure_reserve_pct
custoComponente   = filamento + energia + depreciacao + falha do cálculo salvo   -- SEM a embalagem do componente
subtotal = Σ_partes quantity × custoParte + Σ_componentes quantity × custoComponente
custoTotal = subtotal + embalagem   -- embalagem 1x no conjunto
```
Racional (decisão do usuário): a **reserva de falha é por peça impressa** — cada parte carrega a sua, e cada componente já traz a sua no cálculo salvo. A **embalagem é 1x por produto final**, então a embalagem embutida no custo salvo de cada componente é excluída na agregação e recolocada uma única vez ao final. Energia/depreciação dependem de impressora e tempo, que variam por parte — por isso somados por parte.

Base de gramas do filamento = `piece_grams` (exclui suporte), a mesma base do peso derivado da ficha e do custo de peça simples — mantém partes e peças simples consistentes. A baixa de estoque na produção continua deduzindo peça + suporte (fluxo da fila), independente da base de custo.

### 4. Snapshot em `price_calculations.component_breakdown`
Estende-se o array jsonb para aceitar dois tipos de entrada, sem nova coluna e mantendo o CHECK XOR atual (composta continua com `weight/hours/printer` nulos):
```jsonc
component_breakdown: [
  { "kind": "part", "partId": "...", "name": "Decágono", "quantity": 1,
    "filamentSource": "material|global", "materialId": "...",
    "unitFilament": 1.2, "unitEnergy": 0.3, "unitDepreciation": 0.2, "unitCost": 1.7, "totalCost": 1.7 },
  { "kind": "component", "componentProductId": "...", "quantity": 1, "unitCost": 8.0, "totalCost": 8.0 }
]
```
- `kind` default `component` na leitura para retrocompatibilidade com snapshots antigos (que não têm `kind`).
- `filamentSource` registra a origem do preço do filamento por parte, para auditoria (Requirement de exibição da origem).
- reserva de falha e embalagem entram como campos agregados do snapshot (ou linhas próprias) para o total bater.

### 5. Validação de composição
- Composta precisa de ≥1 parte inline OU ≥1 componente do catálogo para precificar (senão erro "composição vazia").
- Regras de ciclo continuam valendo só para `product_components` (partes inline não referenciam peças, não formam ciclo).
- Componente do catálogo mantém pré-requisito de custo conhecido; parte inline não (traz os próprios dados).

### 6. Unidade de filamento padronizada e saldo canônico em gramas
`materials` do tipo filamento passa a ter CHECK garantindo `unit ∈ ('kg','g')` (embalagem permanece com unidade livre). Isso resolve duas coisas ao mesmo tempo:
- **Custo**: `resolveFilamentCostPerKg` sempre encontra um custo por kg (decisão 2), sem fallback silencioso por unidade estranha.
- **Estoque**: a baixa na fila de impressão já existe (`fila-de-impressao` → `consumo_producao` em `material_stock_movements`, em gramas via `piece_grams + support_grams`). Para o saldo fechar, entradas de filamento informadas em kg devem ser normalizadas para gramas antes de somar — a `unit` livre de hoje permitiria uma `compra` em kg (quantity 1) somar com um `consumo` em g (quantity −70) e dar saldo errado.

Implementação: `material_stock_movements.quantity` de filamento é sempre gravado/derivado em **gramas** (unidade canônica). A view `material_stock_balances` soma em gramas. Uma migração de normalização converte movimentações e cadastros de filamento existentes que não estejam já em gramas/kg conformes (**BREAKING** para dados legados). O `reference_cost` continua na `unit` do insumo (kg ou g), usado só para custo — separado da unidade canônica de saldo.

Escopo de estoque nesta mudança: garantir consistência de unidade da baixa **já existente** por ficha de fatiamento. Deduzir estoque a partir das **partes inline** de uma peça composta impressa pela fila é **non-goal** aqui — a fila continua operando por ficha de fatiamento (ver Non-Goals); partes inline entram no motor de preço, não na baixa de estoque da fila.

## Risks / Trade-offs

- **Conversão de unidade do insumo**: se `materials.unit` tiver valores livres além de kg/g, o fallback global mascara custo errado silenciosamente. Mitigação: registrar `filamentSource` no snapshot e, na UI, sinalizar quando a parte caiu no fallback por unidade não conversível.
- **Duplicação conceitual ficha × parte**: uma parte inline reintroduz gramas/impressora/tempo que a ficha de fatiamento também modela. Trade-off aceito: partes vivem dentro da composta (não vendável), fichas são por peça+impressora do catálogo; não se tenta unificar agora para não acoplar os dois fluxos.
- **`component_breakdown` polimórfico**: misturar `part` e `component` num mesmo jsonb exige leitura defensiva por `kind`. Mitigado por default de `kind='component'` e por os snapshots serem imutáveis (não há reprocessamento retroativo).
- **Reserva de falha por peça**: cada parte/componente recebe falha sobre o próprio custo de impressão (decisão do usuário), o que é mais fiel ao risco real, mas faz o custo de uma composta crescer com o número de peças impressas — esperado, não um bug.
