## Why

Hoje já existe um pipeline de seed funcional (`make seed` / `npm run seed-all`, cobrindo roles, precificação, estoque, catálogo e societário) implementado no código, mas ele nunca foi formalizado como spec — a spec existente (`seed-de-dados-iniciais`) documenta só o `seed-roles`, deixando o restante do pipeline sem contrato formal. Além disso, as novas capacidades planejadas nesta mesma leva de propostas (fila de impressão, calendário de marketing, organizador de ideação de produtos) ainda não têm nenhum dado de exemplo — sem isso, o objetivo original de "usar todas as features sem precisar configurar o sistema" fica incompleto assim que essas capacidades forem implementadas.

## What Changes

- **Formalizar o pipeline já implementado**: documentar como requisito o comando orquestrador único (`make seed` / `npm run seed-all`), que já roda `seed-roles → seed-pricing → seed-inventory → seed-catalog → seed-governance` de forma idempotente, dentro da spec existente `seed-de-dados-iniciais` (hoje ela só cobre `seed-roles`).
- **Estender o seed para as novas capacidades** desta leva de propostas, cada uma com um script novo, idempotente, adicionado ao pipeline orquestrador:
  - `seed-fila-impressao`: alguns itens de exemplo na fila (ao menos um `na_fila` e um `concluido`, este último já refletindo a baixa de estoque correspondente).
  - `seed-marketing`: lista de datas comemorativas nacionais relevantes (Natal, Dia das Mães, Dia dos Pais, Black Friday, Dia dos Namorados, Páscoa, Dia das Crianças) e 1-2 posts de exemplo em status variados.
  - `seed-ideacao-produtos`: a mesma lista de datas comemorativas nacionais (na tabela própria e separada dessa capability, por decisão de manter as duas listas desacopladas) e 1-2 ideias de produto de exemplo vinculadas.
  - Extensão do `seed-roles` para incluir a nova role/sub-role "Ideação de Produtos" com um responsável de exemplo, seguindo o mesmo padrão das 7 áreas já semeadas.
- Atualizar `make seed` / `npm run seed-all` para incluir os novos scripts na ordem correta de dependência (depois de `seed-pricing`/`seed-catalog`, já que a fila de impressão referencia produtos/impressoras/materiais).

## Capabilities

### New Capabilities
(nenhuma — este change estende uma capability já existente e depende, para os novos scripts, das capabilities `fila-de-impressao`, `calendario-marketing-redes-sociais` e `organizador-ideacao-produtos` já propostas.)

### Modified Capabilities
- `seed-de-dados-iniciais`: o requisito de "comando único para popular dados iniciais" deixa de cobrir só `seed-roles` e passa a cobrir o pipeline orquestrador completo (`make seed`/`seed-all`), incluindo os novos scripts desta proposta.

## Impact

- **Domínio de gestão afetado**: transversal (toca todos os domínios, já que o objetivo é permitir navegar qualquer tela do sistema com dado de exemplo).
- **Dependência com camu-docs**: sim, para os dados já implementados e reaproveitados por este change (impressora Ender-3 V3 SE, taxa Mercado Livre, parâmetros de custo) — já documentados em `camu-docs/03-financeiro/*` e semeados por `seed-pricing.ts`/`seed-catalog.ts`. Os dados novos desta proposta (datas comemorativas, ideias de produto de exemplo) **não** vêm de camu-docs — são exemplos genéricos criados para esta proposta.
- **Código**: formaliza em spec o que já está implementado, porém não commitado, em `Makefile`, `package.json` e `scripts/seed-catalog.ts` (ver tasks.md) — commitar esse trabalho já existente faz parte da implementação desta proposta, não é retrabalho.
- **Ordem de execução**: os novos scripts dependem de `seed-pricing`/`seed-catalog` já terem rodado (produtos, impressoras e materiais precisam existir antes da fila de impressão) e de `seed-roles` já ter criado a nova role de Ideação de Produtos.
