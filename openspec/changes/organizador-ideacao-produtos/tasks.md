## 1. Schema / dados

- [ ] 1.1 Criar migration para `commemorative_dates_produtos` (name, rule_type fixa/movel, rule_value, category, is_active, created_by) e `product_ideas` (commemorative_date_id FK nullable, title, description, category enum ProductCategory, status enum ideia/em_desenvolvimento/lancada/descartada, priority, responsible_id, created_by, created_at)
- [ ] 1.2 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços

- [ ] 2.1 Criar `CommemorativeDateProdutoRepository`/`ProductIdeaRepository` em `src/lib/repositories`
- [ ] 2.2 Criar `ProductIdeationService` em `src/lib/services` (createDate, createIdea, updateStatus, listUpcomingDates, listIdeasByStatus)
- [ ] 2.3 Implementar RBAC (escrita: owner/socio/role ideacao-produtos; leitura: qualquer usuário autenticado)

## 3. UI

- [ ] 3.1 Nova rota para a área "Ideação de Produtos" (dependente da role/sub-role ser criada via seed — ver proposta `seed-geral-sistema`)
- [ ] 3.2 Visão de próximas datas comemorativas de produto, com ideias vinculadas a cada uma
- [ ] 3.3 Board de ideias por status (ideia, em desenvolvimento, lançada, descartada)
- [ ] 3.4 Formulário de cadastro de data comemorativa de produto
- [ ] 3.5 Formulário de criação/edição de ideia de produto, com seleção opcional de data comemorativa e categoria
- [ ] 3.6 Ação de avançar/descartar status de uma ideia a partir do board
