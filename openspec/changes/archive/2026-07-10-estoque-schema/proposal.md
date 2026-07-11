## Why

Com Precificação e Catálogo prontos, o painel sabe calcular preço e cadastrar peças, mas ainda não sabe se há filamento suficiente para produzir a próxima leva, nem quantas unidades de uma peça já estão prontas para vender. Hoje esse controle não existe nem na planilha do `camu-docs` (que registra vendas e fluxo de caixa, mas não estoque físico de insumo/peça pronta) — é uma lacuna real de gestão que cresce junto com o catálogo. Este change cria o schema de estoque de insumos e de peças prontas; a UI fica em `estoque-telas`.

## What Changes

- Cria schema para **catálogo de insumos** (`materials`): filamento (por tipo/material e cor) e embalagem, com unidade de medida e custo de referência próprio (complementar ao parâmetro global de `cost_parameters`, permitindo variação de preço por cor/fornecedor sem exigir um novo parâmetro global a cada compra).
- Cria schema para **movimentação de estoque de insumo** (`material_stock_movements`): entradas (compra) e saídas (consumo em produção, perda/refugo, ajuste manual), sempre em log append-only — o saldo é sempre derivado da soma das movimentações, nunca um campo editado diretamente.
- Cria schema para **saldo e alerta de estoque baixo** (`material_stock_thresholds`): limite mínimo configurável por insumo, usado para sinalizar quando o saldo (derivado das movimentações) cair abaixo do esperado.
- Cria schema para **estoque de peças prontas** (`product_stock_movements`): entradas (peça produzida) e saídas (venda, perda, ajuste), vinculado a `products` (de `catalogo-schema`), com saldo também derivado por soma — nunca editado diretamente.
- Cria função/trigger que, ao registrar uma saída de produção de insumo vinculada a uma peça, opcionalmente já registra a entrada correspondente em `product_stock_movements` (produção gera peça pronta), mantendo os dois lados do processo consistentes quando o usuário informar ambos na mesma operação.
- Habilita RLS: leitura ampla para Owner/Sócio e roles `producao`/`financeiro`; escrita (registrar movimentação, configurar limite) restrita a `producao` e Owner/Sócio — Financeiro só consulta, para acompanhar valor de estoque sem interferir na operação.

Não incluído neste change: telas (ficam em `estoque-telas`), integração com fila de produção/assinatura, e baixa automática de peça pronta por venda de marketplace (vendas por canal estão fora do escopo dos 4 changes deste roadmap).

## Capabilities

### New Capabilities
- `estoque-de-insumos`: catálogo de insumos (filamento por tipo/cor, embalagem) com custo de referência próprio.
- `movimentacao-de-estoque-de-insumos`: registro append-only de entradas e saídas de insumo, com saldo sempre derivado.
- `alerta-de-estoque-baixo`: limite mínimo configurável por insumo e sinalização quando o saldo cair abaixo dele.
- `estoque-de-pecas-prontas`: registro append-only de entradas (produção) e saídas (venda/perda/ajuste) de peças do catálogo, com saldo derivado.

### Modified Capabilities
(nenhuma — `catalogo-de-pecas` não muda de requisito; este change só referencia `products` por chave estrangeira em `product_stock_movements`)

## Impact

- **Depende de**: `catalogo-schema` (referencia `products`), `precificacao-schema-motor-calculo` (referencia `printers` ao registrar consumo de insumo por produção), `controle-de-acesso` (roles `producao`, `financeiro`).
- **Novo**: migrations para `materials`, `material_stock_movements`, `material_stock_thresholds`, `product_stock_movements`; `src/lib/repositories/interfaces/{material,material-stock-movement,material-stock-threshold,product-stock-movement}-repository.interface.ts` + implementações Supabase; `src/lib/services/inventory-service.ts`.
- **Domínio de gestão**: Produção (com leitura por Financeiro, que acompanha valor de estoque para o fechamento mensal).
- **Dependência de `camu-docs`**: indireta — não há doc específico de controle de estoque no `camu-docs` hoje (lacuna real identificada durante este planejamento); os únicos números de referência existentes são o filamento inicial (`03-financeiro/investimento-inicial.md`, 3kg PLA genérico) e a reserva de falha já modelada em `precificacao-schema-motor-calculo`. Vale propor ao Owner/Sócio atualizar o `camu-docs` com uma seção de controle de estoque físico depois que este change entrar em uso — hoje o `controle-financeiro.md` só cobre fluxo de caixa e reserva de imposto, não quantidade física de insumo/peça.
- Habilita `estoque-telas` (UI). Também abre caminho, fora deste roadmap de 4 fases, para a fila de produção mensal prevista na Fase 2-4 do roadmap de negócio.
