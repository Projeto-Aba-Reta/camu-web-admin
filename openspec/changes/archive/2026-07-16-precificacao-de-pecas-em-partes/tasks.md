## 1. Banco de dados — partes inline e derivação de custo de filamento

- [x] 1.1 Criar migration `product_parts` (id, product_id → products, name, quantity>0, material_id nullable → materials, piece_grams, support_grams, printer_id → printers, print_hours>0, position, timestamps) com `on delete cascade` no product_id
- [x] 1.2 Habilitar RLS em `product_parts` e criar policies iguais às de `product_components` (select: owner/socio/producao/financeiro/marketing; insert/update/delete: owner/socio/producao)
- [x] 1.3 Adicionar comentários nas colunas explicando parte não vendável, material_id NULL = fallback global, e por que quantidade/gramas/impressora/tempo ficam por parte
- [x] 1.4 Adicionar CHECK em `materials` garantindo `unit ∈ ('kg','g')` para `type = 'filamento'` (embalagem permanece livre); migração de normalização dos filamentos existentes com unidade fora do padrão
- [x] 1.5 Normalizar `material_stock_movements` de filamento para gramas (unidade canônica) — view `material_stock_balances` já soma em gramas; migração de dados legados (compras/ajustes em kg × 1000, consumo já em g)
- [x] 1.6 Rodar `supabase db reset`/lint e confirmar que as migrations aplicam limpas junto às existentes

## 2. Motor de cálculo — custo de filamento por insumo e agregação por partes

- [x] 2.1 Implementar `resolveFilamentCostPerKg(materialId?)`: usa `materials.reference_cost`/`unit` (kg direto, g ×1000) quando resolvível; senão `cost_parameters.filament_cost_per_kg` global
- [x] 2.2 Alterar o cálculo de custo de peça simples/ficha para chamar `resolveFilamentCostPerKg` por linha de material (hoje usa só o global), somando o filamento por linha
- [x] 2.3 Implementar cálculo agregado de composta por partes: por parte `quantity × (filamento + energia + depreciação + falha)` usando impressora/tempo da parte; somar componentes do catálogo × custo do cálculo mais recente (sem embalagem própria)
- [x] 2.4 Reserva de falha por peça impressa (cada parte/componente) e embalagem uma vez sobre o conjunto; manter exigência de porte explícito para composta
- [x] 2.5 Persistir `component_breakdown` polimórfico (`kind: 'part'|'component'`, `filamentSource`, custos unitários/total) e leitura defensiva com default `kind='component'` para snapshots antigos
- [x] 2.6 Garantir que composta sem nenhuma parte nem componente é rejeitada ("composição vazia")

## 3. API / serviço — CRUD de partes e composição híbrida

- [x] 3.1 Endpoints/queries de CRUD de partes inline de uma peça composta (criar, listar, editar, remover), respeitando RLS — `CatalogService` (addPart/updatePart/removePart/listParts) + server actions
- [x] 3.2 Ajustar o serviço de composição para aceitar partes inline e/ou componentes do catálogo no mesmo produto; validar quantidade > 0
- [x] 3.3 Manter a validação de ciclo e o pré-requisito de custo conhecido apenas para componentes do catálogo (partes não exigem cálculo prévio)
- [x] 3.4 Expor, para a tela de cálculo, o breakdown por parte (filamento/energia/depreciação, quantidade, origem do filamento)

## 4. UI — cadastro de partes e breakdown na tela de cálculo

- [x] 4.1 No formulário de peça `composta`, adicionar edição de partes inline (nome, quantidade, filamento do estoque, gramas peça/suporte, impressora, tempo) além dos componentes do catálogo — `ProductPartsManager`
- [x] 4.2 Indicar visualmente que partes não são vendáveis separadamente
- [x] 4.3 Na tela de cálculo de preço, exibir o breakdown por parte/componente e custo total agregado — `resultado-calculo.tsx`
- [x] 4.4 Exibir, por parte, se o custo de filamento veio do insumo vinculado ou do preço global (fallback)
- [x] 4.5 Exigir porte escolhido antes de disparar o cálculo de composta (botão desabilitado sem porte)

## 5. Estoque de insumos — unidade padronizada e baixa consistente

- [x] 5.1 No cadastro/edição de insumo, restringir a unidade de filamento a `kg`/`g` (UI Select + `materialFormSchema`) e manter unidade livre para embalagem
- [x] 5.2 Normalizar entradas/saídas de filamento para gramas ao registrar movimentação (`toStockQuantity` na action; saldo já soma em gramas)
- [x] 5.3 Baixa da fila (`consumo_producao`) já é gravada em gramas; com filamento canônico em gramas, saldo fecha (compra convertida, consumo em g)

## 6. Testes e validação

- [x] 6.1 Testes do `resolveFilamentCostPerKg` (insumo em kg, insumo em g, parte sem insumo → global, não-filamento → global)
- [x] 6.2 Testes de agregação da composta (só partes; misto partes+componentes; falha por peça/embalagem uma vez; composição vazia; porte obrigatório) + CRUD de partes no `CatalogService`
- [x] 6.3 Teste de retrocompatibilidade: snapshot antigo sem `kind` continua legível e inalterado — `isPartBreakdownEntry` em `pricing-formula.ts` + testes em `pricing-formula.test.ts`
- [x] 6.4 Testes de RLS de `product_parts` (marketing lê, não escreve; financeiro lê; producao escreve) — pgTAP em `supabase/tests/database/product_parts_rls.test.sql`, via `npm run test:db`
- [x] 6.5 Testes de estoque: rejeição de filamento com unidade inválida; conversão kg→g (`toStockQuantity`) preservando sinal; embalagem sem conversão
- [x] 6.6 Rodar `openspec validate`, a suíte de testes e o fluxo end-to-end da Caixa Mandala (`supabase db reset` + seed + composta com partes precificada pelos repositórios reais: fallback de filamento, embalagem 1x, snapshot relido, cascade). Clique na UI não automatizado (sem driver de browser no projeto) — app sobe e as rotas respondem
