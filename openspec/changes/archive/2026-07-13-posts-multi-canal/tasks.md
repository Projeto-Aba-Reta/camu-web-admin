> Change registrada retroativamente: a implementação foi feita e verificada contra o banco local antes deste registro, por isso as tasks já nascem concluídas.

## 1. Schema / dados

- [x] 1.1 Criar migration `20260713150000_calendario_marketing_multi_canal.sql`: tabela de junção `social_content_plan_item_channels` (item_id, channel, PK composta, check de valores permitidos), cópia dos itens existentes preservando seu canal, remoção da coluna `channel` de `social_content_plan_items` e policies de RLS com a mesma regra do item dono
- [x] 1.2 Rodar `npm run db:types` para atualizar `src/lib/supabase/database.types.ts`

## 2. Backend / serviços

- [x] 2.1 `SocialContentPlanItem.channels: SocialChannel[]` no lugar de `channel`, com `SOCIAL_CHANNELS` exportado em `src/types/marketing.ts`
- [x] 2.2 `SupabaseSocialContentPlanRepository` carrega os canais (busca separada + junção em memória) e substitui a lista inteira no create/update
- [x] 2.3 `SocialContentPlanService` valida "pelo menos um canal" na criação e na edição

## 3. UI

- [x] 3.1 Formulário de post com seleção múltipla de canais (checkboxes) e atalho "Todas as redes" / "Limpar seleção"
- [x] 3.2 Board e calendário exibem todos os canais do item
