## Why

Com Precificação, Catálogo e Estoque prontos, o painel cobre bem o dia a dia operacional — mas o `camu-docs` também define um conjunto de compromissos societários que hoje só existem em markdown estático (`01-visao-geral/sociedade-e-divisao.md`, `03-financeiro/tipo-pj-mei-vs-me.md`, `05-decisoes/log-decisoes.md`): divisão de lucro entre os 3 sócios, acordo particular de contribuição, enquadramento MEI x ME e seus gatilhos de migração, e o log de decisões relevantes do negócio. Nenhum desses dados é operacional no sentido de uso diário, mas todos precisam de um lugar estruturado e consultável dentro do painel — hoje um sócio que quer saber "qual o enquadramento atual e a que distância estamos do teto do MEI" precisa abrir o repositório `camu-docs` e ler markdown. Este change cria o schema para essas quatro áreas; a UI fica em `societario-telas`.

## What Changes

- Cria schema para o **acordo de sociedade** (`partnership_agreements`): registro versionado (append-only, como os demais dados de configuração já modelados) da regra de divisão de lucro vigente (percentual por sócio ou por hora investida) e das condições de saída de sócio, com histórico de quando o acordo mudou.
- Cria schema para **contribuição de capital** (`capital_contributions`): valor aportado por cada sócio no investimento inicial (ou aportes posteriores), com referência a comprovante (link/arquivo) — reflete o checklist de `sociedade-e-divisao.md` sobre comprovar a contribuição de cada sócio.
- Cria schema para **enquadramento jurídico** (`legal_entity_status`): tipo de PJ vigente (`mei` ou `me`), CNPJ, titular (para MEI), data de vigência — versionado, já que a migração de MEI para ME é um evento estruturado com data.
- Cria schema para **gatilhos de migração** (`legal_migration_triggers`): os 4 gatilhos documentados em `tipo-pj-mei-vs-me.md` (faturamento se aproximando do teto, lançamento de assinatura recorrente, necessidade de mais de 1 funcionário, entrada de investimento externo), cada um com status (`pendente`/`atingido`) e data de quando foi marcado como atingido.
- Cria schema para **acompanhamento de faturamento x teto do MEI** (`revenue_snapshots`): lançamento mensal manual de faturamento acumulado (já que este roadmap de 4 fases não inclui um módulo de vendas/canais que gere esse número automaticamente), usado para calcular o percentual do teto anual do MEI já atingido e alimentar o gatilho de faturamento.
- Cria schema para o **log de decisões** (`decision_log_entries`): réplica estruturada do formato ADR já usado em `camu-docs/05-decisoes/log-decisoes.md` (contexto, decisão, alternativas consideradas, motivo), permitindo registrar novas decisões direto no painel em vez de só em markdown.
- Habilita RLS: todas as tabelas deste domínio SHALL ser legíveis e editáveis apenas por Owner/Sócio — é o único domínio deste roadmap sem acesso de `member`/role, já que envolve dados de sociedade e enquadramento fiscal que só dizem respeito aos 3 sócios.

Não incluído neste change: telas (ficam em `societario-telas`); qualquer automação real de cálculo de imposto/DAS (fora de escopo — é apuração feita fora do painel, este change só registra o snapshot mensal de faturamento para fins de alerta).

## Capabilities

### New Capabilities
- `acordo-de-sociedade`: regra de divisão de lucro e condições de saída de sócio, versionadas no tempo.
- `contribuicao-de-capital`: registro de aporte de cada sócio com referência de comprovante.
- `enquadramento-juridico`: tipo de PJ vigente (MEI/ME) e histórico de mudança.
- `gatilhos-de-migracao-juridica`: acompanhamento de status dos gatilhos de migração de MEI para ME.
- `acompanhamento-de-faturamento-x-teto`: lançamento mensal de faturamento acumulado e cálculo do percentual do teto do MEI atingido.
- `log-de-decisoes`: registro estruturado de decisões relevantes do negócio, no formato já usado no `camu-docs`.

### Modified Capabilities
(nenhuma — nenhuma capability existente muda de requisito; este é um domínio novo e isolado)

## Impact

- **Depende de**: `controle-de-acesso` (`is_socio_or_owner()` para RLS; nenhuma role de `member` tem acesso a este domínio).
- **Novo**: migrations para `partnership_agreements`, `capital_contributions`, `legal_entity_status`, `legal_migration_triggers`, `revenue_snapshots`, `decision_log_entries`; `src/lib/repositories/interfaces/{partnership-agreement,capital-contribution,legal-entity-status,legal-migration-trigger,revenue-snapshot,decision-log-entry}-repository.interface.ts` + implementações Supabase; `src/lib/services/governance-service.ts`.
- **Domínio de gestão**: Societário/Governança — o único dos 5 domínios do painel restrito exclusivamente a Owner/Sócio, sem participação de `member`.
- **Dependência de `camu-docs`**: direta e estrutural — todas as 6 capabilities deste change espelham conteúdo hoje existente em `01-visao-geral/sociedade-e-divisao.md`, `03-financeiro/tipo-pj-mei-vs-me.md` e `05-decisoes/log-decisoes.md`. A intenção é que o painel se torne a fonte viva desses dados; o `camu-docs` continua como documentação de raciocínio/contexto (por que as regras existem), enquanto o painel passa a registrar o estado atual e sua evolução.
- Fecha a última fase deste roadmap de 4 fases — junto com Precificação, Catálogo e Estoque, completa a primeira versão 100% funcional do painel prevista pelo usuário.
