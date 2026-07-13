## 1. Schema / dados

- [ ] 1.1 Criar migration para `commemorative_dates_marketing` (name, rule_type fixa/movel, rule_value, category, is_active, created_by) e `social_content_plan_items` (commemorative_date_id FK nullable, title, channel, status enum, responsible_id, target_date, notes, created_by, created_at)
- [ ] 1.2 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços

- [ ] 2.1 Criar `CommemorativeDateRepository`/`SocialContentPlanRepository` em `src/lib/repositories`
- [ ] 2.2 Criar `SocialContentPlanService` em `src/lib/services` (createDate, createPlanItem, advanceStatus, listByMonth, listByStatus) com validação de transição de status na sequência definida
- [ ] 2.3 Implementar RBAC (escrita: owner/socio/role marketplace-vendas; leitura: mesma role)

## 3. UI

- [ ] 3.1 Nova rota dentro da área Marketplace/Vendas para o calendário de marketing
- [ ] 3.2 Visão de calendário mensal (datas comemorativas + posts do mês)
- [ ] 3.3 Visão de board por status (colunas ideia/roteiro/gravação/edição/agendado/publicado)
- [ ] 3.4 Formulário de cadastro de data comemorativa
- [ ] 3.5 Formulário de criação/edição de item de planejamento, com seleção opcional de data comemorativa
- [ ] 3.6 Ação de avançar status de um item a partir do board
