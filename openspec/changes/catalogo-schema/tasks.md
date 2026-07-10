## 1. Pré-requisito (backend/dados)

- [ ] 1.1 Confirmar no banco os slugs reais das roles `producao`, `financeiro` e `marketplace-vendas` do seed de `fundacao-admin-roles-usuarios`, ajustando as policies deste change se divergirem

## 2. Schema de catálogo (backend/dados)

- [ ] 2.1 Migration: criar tabela `products` (`id`, `name`, `description`, `category` CHECK, `size_tier` CHECK, `status` CHECK default `rascunho`, `price_calculation_id` nullable FK, `created_by`, timestamps)
- [ ] 2.2 Migration: criar tabela `product_media` (`id`, `product_id` FK cascade, `storage_path`, `display_order`, `is_cover`, `created_at`) com índice único parcial garantindo no máximo uma capa por peça
- [ ] 2.3 Migration: criar tabela `product_channel_listings` (`id`, `product_id` FK cascade, `channel` CHECK, `listed_price`, `is_active`, `price_override_reason` nullable, timestamps) com `unique(product_id, channel)`
- [ ] 2.4 Migration: constraint/trigger exigindo `price_override_reason` quando `listed_price` divergir do preço sugerido do cálculo vinculado
- [ ] 2.5 Migration: habilitar RLS nas 3 tabelas e criar policies conforme `design.md`
- [ ] 2.6 Gerar tipos TypeScript do schema (`npm run db:types`)

## 3. Camada de repositórios e services (backend/dados)

- [ ] 3.1 Definir interfaces em `src/lib/repositories/interfaces/`: `product-repository.interface.ts`, `product-media-repository.interface.ts`, `product-channel-listing-repository.interface.ts`
- [ ] 3.2 Implementar as 3 interfaces em `src/lib/repositories/supabase/`
- [ ] 3.3 Registrar as novas implementações na composition root `src/lib/repositories/index.ts`
- [ ] 3.4 Criar `src/types/catalog.ts` com os tipos compartilhados (`Product`, `ProductMedia`, `ProductChannelListing`)
- [ ] 3.5 Criar `src/lib/services/catalog-service.ts`: criação/edição de peça, vínculo com cálculo de preço (copiando sugestão inicial para `product_channel_listings`), gestão de mídia (capa única) e de listagens por canal (validação de motivo de divergência)

## 4. Verificação

- [ ] 4.1 Teste unitário: vincular peça a um cálculo de preço copia sugestão inicial para `product_channel_listings` sem alterar o cálculo original
- [ ] 4.2 Teste unitário: criar listagem com preço divergente sem motivo é rejeitado; com motivo é aceito
- [ ] 4.3 Teste unitário: marcar uma segunda foto como capa desmarca a anterior (ou rejeita, conforme decisão de implementação)
- [ ] 4.4 Testar manualmente via Supabase Studio local: usuário com role `marketplace-vendas` consegue ler peças e atualizar listagem por canal, mas não consegue cadastrar peça nem mídia
