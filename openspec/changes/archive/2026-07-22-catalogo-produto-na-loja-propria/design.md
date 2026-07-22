## Context

O catálogo do ERP (`products`, `product_channel_listings`, `product_media`, `price_calculations`) já modela peça, disponibilidade/preço por canal e mídia. A loja do site (`camu-web-landing-page`) lê esse catálogo via service role e monta a vitrine: pega peças `ativo` com listagem `loja_propria` ativa, usa o `listed_price` como preço e a capa (`is_cover`) como imagem. Faltam, no cadastro, os campos e a semântica que a loja precisa. A migration `20260722120000_pedidos_loja_e_canal_site.sql` (criada junto do fluxo de pedidos) já adicionou o valor `loja_propria` ao check de `product_channel_listings.channel`.

## Goals / Non-Goals

**Goals**
- Tornar o canal `loja_propria` gerenciável no cadastro, reusando o modelo de listagem por canal já existente.
- Dar à peça os campos que a loja exibe: `slug` (URL), prazo de produção e descrição pública.
- Garantir que uma peça só seja publicada no site quando estiver apresentável (capa + preço + slug + status ativo).

**Non-Goals**
- Construir a vitrine/checkout — isso é do `camu-web-landing-page`.
- Exibir "pronta entrega" a partir do estoque de peças prontas na loja (fica para uma mudança futura; hoje a loja trata tudo como sob encomenda).
- Variantes/acabamento (Bruto/Lixado/Pintado) por peça — não modelado; fora de escopo até haver decisão de negócio.
- Mexer no motor de precificação para emitir um preço sugerido de `loja_propria`.

## Decisions

1. **Preço do site via `product_channel_listings` (canal `loja_propria`), não coluna nova em `products`.** Mantém uma única fonte de verdade de preço por canal e reusa a UI/RBAC de disponibilidade por canal. Publicar no site = listagem `loja_propria` com `is_active = true`.
2. **Sem motivo de divergência para `loja_propria`.** O motor (`price_calculations.channel_prices`) não emite esse canal; o trigger existente compara com o sugerido e, sendo nulo, não exige motivo. A margem-alvo B2C (`cost_parameters`) pode orientar o preço, mas não é imposta.
3. **`slug` único, gerado do nome, editável.** Backfill dos existentes a partir do nome (com sufixo numérico em colisão). Trocar o slug depois quebra links já publicados — a UI avisa. `slug` é `not null` após backfill, com `unique`.
4. **Prazo de produção como faixa (`production_lead_days_min`/`_max`, nullable).** Casa com o "5-7 dias" do design e é mais honesto que um número único; nulo → a loja mostra só "feito sob encomenda".
5. **Prontidão para publicar é regra de serviço/UI, não trigger de banco.** Ativar a listagem `loja_propria` exige, na camada de aplicação, que a peça tenha status `ativo`, `slug`, capa e preço. Evita acoplar `products`/`product_media`/`product_channel_listings` num trigger cross-tabela frágil; o banco mantém os campos, a regra vive no service (com feedback claro na tela).
6. **Descrição pública = `description` da peça.** Não criar campo novo de texto; a `description` já é adequada e a tela deixa claro que ela aparece pro cliente.

## Risks / Trade-offs

- **Regra de prontidão só na aplicação** pode ser furada por escrita direta no banco (ex.: ativar listagem via SQL sem capa). Aceitável: a loja, ao montar a vitrine, também filtra por capa/preço, então uma peça "meia-boca" no máximo aparece sem imagem — degradação suave, não erro.
- **Slug editável** permite quebra de links. Mitigação: aviso na UI; (futuro possível) tabela de redirects de slug antigo → novo, fora de escopo aqui.
- **Contrato cross-repo**: `camu-web-landing-page` depende de `slug`, prazo e do canal `loja_propria`. Mudanças precisam ser coordenadas — documentar no README de ambos.

## Open Questions

- Prazo de produção deve poder ser herdado do porte (P/M/G) como default, ou é sempre por peça? (Proposta atual: por peça, nullable; herança de porte fica para depois.)
- A loja deve poder mostrar mais de uma foto (galeria) ou só a capa? `product_media` já suporta várias com ordem; a decisão é do front. Não bloqueia esta mudança.
