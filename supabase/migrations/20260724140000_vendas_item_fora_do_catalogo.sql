-- =============================================================================
-- Vendas: item fora do catálogo com custo vindo da precificação
-- =============================================================================
-- Nem toda venda é de peça catalogada — encomenda sob medida, brinde, peça de
-- teste. O item passa a poder existir só com o nome digitado (product_id nulo,
-- que a tabela já aceitava) e a carregar o custo unitário estimado pela
-- precificação simples feita na hora da venda.
--
-- O custo estimado NÃO fica só no item: ele vira um lançamento em order_costs,
-- que é a única fonte de custo das views order_financials e
-- sales_monthly_results. Sem isso o pedido apareceria com lucro igual à
-- receita nas telas de custo real e de resultado.

alter table public.order_items
  add column unit_cost_cents integer check (unit_cost_cents is null or unit_cost_cents >= 0);

comment on column public.order_items.unit_cost_cents is
  'Custo unitário estimado pela precificação simples no momento da venda, em centavos. Nulo quando o item não passou pela precificação. É memória do cálculo — o custo que conta para lucro é o lançamento correspondente em order_costs.';

comment on column public.order_items.product_id is
  'Nulo em duas situações: item cadastrado fora do catálogo (encomenda sob medida, brinde) e peça excluída do catálogo depois da venda. Em ambas, product_name preserva o histórico.';

-- Lançamento derivado da precificação é reescrito a cada gravação do pedido;
-- o manual é do time e nunca é tocado. Sem esta marca, salvar o pedido duas
-- vezes empilharia o mesmo custo, ou apagaria o que o time lançou à mão.
alter table public.order_costs
  add column source text not null default 'manual'
  check (source in ('manual', 'precificacao'));

comment on column public.order_costs.source is
  'manual = lançado pelo time na tela de custo real. precificacao = derivado do custo estimado dos itens, recalculado pelo SalesService a cada gravação do pedido.';

-- Um pedido tem no máximo um lançamento derivado da precificação: o serviço
-- procura por ele para atualizar em vez de inserir outro.
create unique index order_costs_single_pricing_entry_idx
  on public.order_costs (order_id)
  where source = 'precificacao';
