## 1. Schema / dados

- [x] 1.1 Criar migration para `commemorative_dates_marketing` (name, rule_type fixa/movel, rule_value, category, is_active, created_by), `social_content_plan_items` (commemorative_date_id FK nullable, title, channel, status enum, responsible_id, target_date, notes, created_by, created_at) e `social_content_plan_status_events` (item_id, from_status, to_status, changed_by, changed_at) — tabela de histórico acrescentada para cumprir o Requirement "Progressão de status do funil de conteúdo" (histórico de quem alterou), já que a policy de insert do `audit_log` exige Owner
- [x] 1.2 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços

- [x] 2.1 Criar `CommemorativeDateRepository`/`SocialContentPlanRepository` em `src/lib/repositories`
- [x] 2.2 Criar `SocialContentPlanService` em `src/lib/services` (createDate, createPlanItem, advanceStatus, listByMonth, listByStatus) com validação de transição de status na sequência definida
- [x] 2.3 Implementar RBAC (escrita: owner/socio/role marketplace-vendas; leitura: mesma role)

## 3. UI

- [x] 3.1 Nova rota dentro da área Marketplace/Vendas para o calendário de marketing (`/marketplace/calendario`, registrada em `area-routes.ts` como página padrão da role `marketplace-vendas`)
- [x] 3.2 Visão de calendário mensal (datas comemorativas + posts do mês), com navegação livre entre meses via `?mes=AAAA-MM`
- [x] 3.3 Visão de board por status (colunas ideia/roteiro/gravação/edição/agendado/publicado)
- [x] 3.4 Formulário de cadastro de data comemorativa
- [x] 3.5 Formulário de criação/edição de item de planejamento, com seleção opcional de data comemorativa
- [x] 3.6 Ação de avançar status de um item a partir do board
