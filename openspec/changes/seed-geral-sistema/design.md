## Context

O pipeline de seed já existe em código (não commitado): `Makefile` tem um target `seed` que roda `seed-roles`, `seed-pricing`, `seed-inventory`, `seed-catalog` e `seed-governance` em sequência, chamado automaticamente por `make dev`/`make db-reset`; `package.json` tem o mesmo pipeline como `npm run seed-all`. Cada script já segue o mesmo padrão de idempotência (upsert por chave natural: slug, nome, e-mail ou vigência), então rodar de novo nunca duplica dado. A spec `seed-de-dados-iniciais` hoje só documenta o `seed-roles`; este change atualiza essa spec para refletir o pipeline completo e a estende para os novos seeds das capacidades desta leva de propostas.

## Goals / Non-Goals

**Goals:**
- Formalizar em spec o pipeline de seed já implementado, cobrindo todos os domínios existentes.
- Garantir que, assim que as novas capacidades forem implementadas, elas já tenham dado de exemplo navegável via `make seed`.
- Manter a mesma garantia de idempotência e mesma ordem de dependência do pipeline já existente.

**Non-Goals:**
- Popular dados de produção reais (o aviso final de cada script já deixa claro que são dados de exemplo/pesquisa, a revisar antes de uso real) — este change não muda essa natureza.
- Cobrir capacidades fora desta leva de propostas (ex. domínio de assinatura recorrente, ainda não implementado) — só as capacidades novas desta rodada.

## Decisions

- **Estender a spec existente (`seed-de-dados-iniciais`) em vez de criar uma nova**: o propósito já é "popular dados iniciais de forma idempotente" — o pipeline completo é uma extensão natural do mesmo requisito, não uma capability conceitualmente diferente.
- **Um script por domínio, orquestrado por um único comando**: mantém o padrão já estabelecido (`seed-roles`, `seed-pricing`, etc.) em vez de um único script monolítico — cada domínio pode ser re-executado isoladamente para depuração, e o orquestrador (`make seed`/`seed-all`) garante a ordem correta.
- **Datas comemorativas de exemplo ficam fixas em código** (não vêm de nenhuma fonte externa) — lista curta e nacional (Natal, Dia das Mães, Dia dos Pais, Black Friday, Dia dos Namorados, Páscoa, Dia das Crianças), suficiente para demonstrar as telas de calendário sem exigir integração com nenhuma API de feriados/datas.
- **`seed-fila-impressao` roda depois de `seed-catalog`**: precisa de produtos com cálculo de preço vinculado (peso) e de materiais/impressoras já existentes — mesma dependência que `seed-catalog` já tem hoje de `seed-pricing`.
- **`seed-ideacao-produtos` depende de `seed-roles` já ter criado a role "Ideação de Produtos"**: o responsável de exemplo da ideia referencia o usuário de exemplo dessa nova sub-role.

## Risks / Trade-offs

- [Risco] Trabalho já implementado, porém não commitado (`Makefile`, `package.json`, `seed-catalog.ts`), pode divergir do que está descrito aqui se for alterado antes deste change ser implementado → Mitigação: a tarefa de commit desses arquivos já existentes deve ser a primeira do `tasks.md` desta proposta, antes de estender o pipeline.
- [Trade-off] Datas comemorativas fixas em código (sem fonte externa) podem ficar desatualizadas em anos futuros (ex. datas móveis como Páscoa) → Aceito para esta versão de seed de exemplo; o cadastro real das datas continua editável pela UI de cada capability.

## Open Questions

- Deve haver um `make seed-<dominio>` individual para cada um dos novos scripts (como já existe `npm run seed-catalog` isolado), além do orquestrador? Assumido: sim, mantendo o padrão já existente de cada script ter seu próprio comando `npm run seed-<dominio>`, além de constar no orquestrador.
