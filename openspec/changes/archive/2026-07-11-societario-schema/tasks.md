## 1. Schema de acordo e capital (backend/dados)

- [x] 1.1 Migration: criar tabela `partnership_agreements` (`id`, `profit_split_rule`, `exit_terms`, `valid_from`, `created_by`)
- [x] 1.2 Migration: criar tabela `capital_contributions` (`id`, `partner_profile_id`, `amount`, `contribution_date`, `proof_reference`, `created_by`, `created_at`)
- [x] 1.3 Migration: habilitar RLS em ambas com policy uniforme `is_socio_or_owner()`

## 2. Schema de enquadramento jurídico e gatilhos (backend/dados)

- [x] 2.1 Migration: criar tabela `legal_entity_status` (`id`, `entity_type` CHECK, `cnpj`, `titular_profile_id` nullable, `valid_from`, `created_by`)
- [x] 2.2 Migration: constraint/trigger exigindo `titular_profile_id` quando `entity_type = 'mei'`
- [x] 2.3 Migration: criar tabela `legal_migration_triggers` (`id`, `trigger_type` CHECK unique, `status` CHECK default `pendente`, `reached_at` nullable, `notes`, `updated_by`, `updated_at`)
- [x] 2.4 Migration: habilitar RLS em ambas com policy uniforme `is_socio_or_owner()`

## 3. Schema de faturamento x teto do MEI (backend/dados)

- [x] 3.1 Migration: criar tabela `mei_ceiling_parameters` (`id`, `year` unique, `annual_ceiling`, `created_by`)
- [x] 3.2 Migration: criar tabela `revenue_snapshots` (`id`, `reference_month` unique, `monthly_revenue`, `notes`, `created_by`, `created_at`)
- [x] 3.3 Migration: criar view/função de cálculo do percentual do teto atingido (soma dos últimos 12 `revenue_snapshots` ÷ `mei_ceiling_parameters` do ano corrente)
- [x] 3.4 Migration: habilitar RLS em ambas com policy uniforme `is_socio_or_owner()`

## 4. Schema do log de decisões (backend/dados)

- [x] 4.1 Migration: criar tabela `decision_log_entries` (`id`, `title`, `context`, `decision`, `alternatives_considered`, `reasoning`, `decided_at`, `created_by`, `created_at`)
- [x] 4.2 Migration: habilitar RLS com policy `is_socio_or_owner()`
- [x] 4.3 Gerar tipos TypeScript do schema (`npm run db:types`)

## 5. Camada de repositórios e services (backend/dados)

- [x] 5.1 Definir interfaces em `src/lib/repositories/interfaces/`: `partnership-agreement-repository.interface.ts`, `capital-contribution-repository.interface.ts`, `legal-entity-status-repository.interface.ts`, `legal-migration-trigger-repository.interface.ts`, `revenue-snapshot-repository.interface.ts`, `decision-log-entry-repository.interface.ts`
- [x] 5.2 Implementar as 6 interfaces em `src/lib/repositories/supabase/`
- [x] 5.3 Registrar as novas implementações na composition root `src/lib/repositories/index.ts`
- [x] 5.4 Criar `src/types/governance.ts` com os tipos compartilhados
- [x] 5.5 Criar `src/lib/services/governance-service.ts`: acordo/capital, enquadramento/gatilhos, cálculo de percentual do teto, log de decisões

## 6. Seed a partir do camu-docs (backend/dados)

- [x] 6.1 Criar `scripts/seed-governance.ts` (idempotente): `legal_entity_status` inicial `mei`, os 4 `legal_migration_triggers` com status `pendente`, `mei_ceiling_parameters` para 2026 (R$81.000)
- [x] 6.2 Transcrever as entradas existentes em `camu-docs/05-decisoes/log-decisoes.md` para `decision_log_entries`, preservando data e conteúdo (6 entradas hoje no documento, não mais 4 — ver nota abaixo)
- [x] 6.3 Adicionar script `seed-governance` no `package.json`

## 7. Verificação

- [x] 7.1 Teste unitário: registro de `legal_entity_status` com `entity_type = 'mei'` sem titular é rejeitado
- [x] 7.2 Teste unitário: cálculo do percentual do teto com histórico parcial (menos de 12 meses) soma apenas os meses existentes
- [x] 7.3 Rodar `npm run seed-governance` duas vezes seguidas em um banco local e confirmar ausência de duplicatas
- [x] 7.4 Testar manualmente via Supabase Studio local: usuário `member` não consegue ler nenhuma das 7 tabelas deste change (verificado via REST API local com usuário de teste, equivalente ao Studio)
