## Context

`camu-docs` já documenta com bastante detalhe as regras societárias (`01-visao-geral/sociedade-e-divisao.md`), o enquadramento jurídico e seus gatilhos de migração (`03-financeiro/tipo-pj-mei-vs-me.md`) e mantém um log de decisões em formato ADR (`05-decisoes/log-decisoes.md`). Este domínio é o único dos cinco descritos no `openspec/config.yaml` que ainda não tem nenhuma representação no painel. Diferente dos domínios operacionais (Precificação, Catálogo, Estoque), aqui os dados mudam raramente (uma decisão de sociedade não é revisada todo dia) mas têm alto peso — um erro de leitura sobre a regra de divisão de lucro ou sobre a proximidade do teto do MEI tem consequência financeira e legal real.

## Goals / Non-Goals

**Goals:**
- Espelhar fielmente as estruturas já existentes no `camu-docs` (acordo, contribuição, enquadramento, gatilhos, log de decisões) como dados versionados e consultáveis no painel.
- Calcular o percentual do teto anual do MEI já atingido a partir de lançamentos mensais manuais de faturamento.
- Restringir todo o domínio a Owner/Sócio — nenhum `member` (funcionário) deve ver dados de sociedade, capital ou enquadramento fiscal.

**Non-Goals:**
- Cálculo automático de DAS/Simples Nacional ou qualquer apuração fiscal real — isso continua sendo trabalho de contador/apuração externa; o painel só registra o snapshot de faturamento para fins de alerta.
- Importação automática de faturamento de vendas/marketplace — não há módulo de vendas neste roadmap de 4 fases; o lançamento de `revenue_snapshots` é manual.
- Assinatura eletrônica ou validade jurídica do acordo de sociedade registrado no painel — o acordo formal continua sendo o documento assinado fisicamente/digitalmente fora do sistema; o painel registra um resumo estruturado para consulta, não substitui o documento legal.
- Qualquer regra de negócio automática que dispare uma ação ao atingir um gatilho de migração (ex.: bloquear alguma função do sistema) — os gatilhos são informativos/de acompanhamento, a decisão de migrar continua sendo humana.

## Decisions

### 1. Todas as tabelas deste domínio restritas a Owner/Sócio, sem exceção de role
Diferente de Precificação/Catálogo/Estoque (que liberam leitura a roles de domínio como `financeiro`/`producao`), aqui a policy de RLS é uniformemente `is_socio_or_owner()` para leitura e escrita, sem nenhuma composição com `has_role(...)`. **Motivo**: divisão de lucro, contribuição de capital e enquadramento fiscal são informações que dizem respeito à sociedade entre os 3 sócios — não há papel de "funcionário com acesso a dados societários" no modelo de negócio descrito no `camu-docs`. **Alternativa considerada**: liberar leitura a uma eventual role `societario` (a mesma citada no seed de `fundacao-admin-roles-usuarios`). Rejeitada porque a role `societario` no seed atual é atribuída a um dos sócios já coberto por `is_socio_or_owner()` — criar uma segunda via de acesso duplicaria o caminho de autorização sem necessidade real.

### 2. Acordo de sociedade e contribuição de capital como tabelas separadas, ambas versionadas
`partnership_agreements`: `id`, `profit_split_rule text` (descrição livre da regra vigente, ex.: "50/50 direto" ou "ajustado por hora investida" — mantido como texto estruturado simples nesta fase, não uma fórmula executável), `exit_terms text`, `valid_from timestamptz default now()`, `created_by`. `capital_contributions`: `id`, `partner_profile_id references profiles(id)`, `amount numeric`, `contribution_date date`, `proof_reference text` (link/descrição do comprovante — arquivo real fica fora do schema nesta fase, como referência textual), `created_by`, `created_at`. **Motivo de separar**: a regra de divisão de lucro é uma decisão única vigente por vez (versionada por `valid_from`), enquanto contribuição de capital é uma lista de eventos (cada sócio contribui em momentos diferentes) — misturar os dois na mesma tabela forçaria um modelo de dados artificial.

### 3. Enquadramento jurídico e gatilhos de migração como tabelas relacionadas mas distintas
`legal_entity_status`: `id`, `entity_type text CHECK (entity_type in ('mei','me'))`, `cnpj text`, `titular_profile_id references profiles(id)` (nullable quando `entity_type = 'me'`, já que ME tem os 3 sócios no contrato social), `valid_from timestamptz default now()`, `created_by`. `legal_migration_triggers`: `id`, `trigger_type text CHECK (trigger_type in ('faturamento_proximo_teto','lancamento_assinatura_recorrente','necessidade_mais_funcionarios','investimento_externo'))`, `status text CHECK (status in ('pendente','atingido')) default 'pendente'`, `reached_at timestamptz nullable`, `notes text`, `unique(trigger_type)` (cada gatilho existe uma vez, com status atualizado in-place — diferente das demais tabelas deste roadmap, aqui não há necessidade de histórico de "quantas vezes o gatilho oscilou", só o estado atual). **Alternativa considerada**: versionar `legal_migration_triggers` como as demais tabelas de configuração. Rejeitada porque um gatilho não "muda de valor" ao longo do tempo da mesma forma que um parâmetro de custo — ele é atingido ou não, e isso é mais bem modelado como estado atual simples com timestamp de quando mudou.

### 4. `revenue_snapshots` mensal manual, com cálculo de percentual do teto derivado
`revenue_snapshots`: `id`, `reference_month date` (primeiro dia do mês, `unique`), `monthly_revenue numeric`, `notes`, `created_by`, `created_at`. O percentual do teto anual (R$81.000 em 2026, mas mantido como constante configurável, não hardcoded, já que o valor muda por ano-calendário conforme a legislação do MEI) é calculado somando os últimos 12 `revenue_snapshots` e dividindo pelo teto vigente — exposto por uma view/função, não armazenado. **Motivo de manter manual**: sem um módulo de vendas consolidado neste roadmap, o número mensal de faturamento só existe hoje na planilha de controle financeiro do `camu-docs`; lançar manualmente uma vez por mês é consistente com a rotina mensal já descrita em `controle-financeiro.md`.

### 5. Teto do MEI como parâmetro configurável, não constante de código
Cria-se uma tabela mínima `mei_ceiling_parameters` (`id`, `year int unique`, `annual_ceiling numeric`, `created_by`) em vez de hardcodar R$81.000 — o teto já mudou de valor por lei em anos anteriores e pode mudar de novo; tratar como dado configurável evita uma migration de código só para atualizar um número anual.

### 6. Log de decisões como tabela append-only espelhando o formato ADR do `camu-docs`
`decision_log_entries`: `id`, `title`, `context text`, `decision text`, `alternatives_considered text`, `reasoning text`, `decided_at date`, `created_by`, `created_at`. Nunca editado após criado (correção é uma nova entrada referenciando a anterior, se necessário) — mesmo princípio de imutabilidade já usado em todo o restante do domínio de configuração do painel, e already o padrão do `log-decisoes.md` ("Adicionar novas entradas no topo", nunca reescrever uma existente).

## Risks / Trade-offs

- **[Risco]** `revenue_snapshots` depende de lançamento manual disciplinado — se um mês for esquecido, o cálculo de percentual do teto fica com um buraco. → **Mitigação**: a UI (`societario-telas`) deve destacar meses sem lançamento; aceito como limitação desta fase sem módulo de vendas automatizado.
- **[Risco]** `profit_split_rule` como texto livre (não uma fórmula estruturada/executável) limita validação automática de que a divisão soma 100%. → **Mitigação**: aceito conscientemente — o `camu-docs` já trata isso como texto ("50/50 direto" vs. "ajustado por hora investida"), formalizar como fórmula executável seria overengineering para uma decisão revisada raramente.
- **[Risco]** Restringir 100% do domínio a Owner/Sócio significa que, se um dia a Camu contratar um funcionário de confiança para apoio administrativo/societário, o modelo de acesso atual não tem meio-termo (é `member` sem acesso, ou vira Sócio). → **Mitigação**: aceito como reflexo fiel do modelo de negócio atual (3 sócios, sem essa necessidade hoje); revisitar se a estrutura societária mudar.

## Migration Plan

1. `supabase/migrations/<timestamp>_societario_acordo_enquadramento_decisoes.sql`: cria as 7 tabelas (`partnership_agreements`, `capital_contributions`, `legal_entity_status`, `legal_migration_triggers`, `revenue_snapshots`, `mei_ceiling_parameters`, `decision_log_entries`), RLS e policies (`is_socio_or_owner()` uniforme).
2. Seed opcional (`scripts/seed-governance.ts`, idempotente): `legal_entity_status` inicial (`mei`), os 4 `legal_migration_triggers` com status `pendente`, `mei_ceiling_parameters` para 2026 (R$81.000), e as 4 entradas already existentes no log de decisões do `camu-docs` (transcritas para `decision_log_entries`, preservando data e conteúdo original).
3. Aplicar local via `supabase db reset`; hospedado via `supabase db push`.
4. Rollback: sem dado de produção dependente (tabelas novas) — `drop table` é seguro nesta fase.

## Open Questions

- Se o acordo de sociedade formal (documento assinado) for digitalizado, avaliar se `partnership_agreements`/`capital_contributions` ganham um campo de anexo real (Storage) em vez de só referência textual — não decidido aqui, mesma decisão de mídia já tomada para peças em `catalogo-schema` pode servir de precedente.
- Avaliar, quando a Camu crescer, se caber um papel intermediário entre `member` e `socio` para apoio administrativo em parte deste domínio — não há demanda hoje.
