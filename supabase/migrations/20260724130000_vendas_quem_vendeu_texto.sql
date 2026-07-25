-- =============================================================================
-- Vendas: "quem vendeu" vira texto livre
-- =============================================================================
-- Quem fecha a venda nem sempre tem conta no ERP — amiga que revendeu na feira,
-- parente que indicou, expositor parceiro. Amarrar o campo a profiles.id
-- obrigava a criar usuário para registrar a venda, então o campo passa a ser o
-- nome escrito à mão. O que se perde (link com o perfil) não era usado em lugar
-- nenhum: nenhuma view, policy ou relatório lia sold_by_profile_id.

alter table public.orders
  add column sold_by_name text;

-- Nome vazio é o mesmo que "ninguém em específico" — sem isto, string em branco
-- e null virariam dois jeitos de dizer a mesma coisa na listagem e no filtro.
alter table public.orders
  add constraint orders_sold_by_name_not_blank
  check (sold_by_name is null or btrim(sold_by_name) <> '');

-- Backfill antes do drop: o nome do perfil é o que a tela já mostrava, então
-- copiá-lo preserva exatamente o que o usuário via.
update public.orders o
set sold_by_name = nullif(btrim(coalesce(p.full_name, p.email)), '')
from public.profiles p
where p.id = o.sold_by_profile_id;

alter table public.orders
  drop column sold_by_profile_id;

comment on column public.orders.sold_by_name is
  'Quem vendeu, em texto livre — pode ser alguém sem conta no ERP. Obrigatório quando sale_origins.requires_seller, validado no SalesService e não no banco, porque a regra depende de uma linha de outra tabela que o time pode alternar a qualquer momento.';
