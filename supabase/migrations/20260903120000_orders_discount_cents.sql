-- Desconto no pedido da loja do site.
--
-- A landing page (camu-web-landing-page) passa a aplicar promoções no checkout —
-- a primeira é a promoção "leve 2" da miniatura de pet: cada par de miniaturas
-- ganha X% OFF. O valor abatido fica registrado aqui pra o ERP (financeiro/
-- vendas) enxergar receita bruta vs. líquida.
--
-- Regra: total_cents = subtotal_cents + shipping_cents - discount_cents.
-- Sem CHECK amarrando a equação — frete e desconto variam por pedido e a
-- landing page é a fonte da verdade do cálculo.

alter table public.orders
  add column discount_cents integer not null default 0 check (discount_cents >= 0);

comment on column public.orders.discount_cents is
  'Desconto aplicado ao pedido, em centavos (ex.: promoção "leve 2" da miniatura de pet). total_cents = subtotal_cents + shipping_cents - discount_cents.';
