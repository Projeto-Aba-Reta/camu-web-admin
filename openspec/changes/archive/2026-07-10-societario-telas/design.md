## Context

O schema de governança (`societario-schema`) já existe, com todas as tabelas restritas a `is_socio_or_owner()`. A role `societario`, populada pelo seed de `fundacao-admin-roles-usuarios`, existe hoje apenas para fins de organização/exibição de sidebar (`navegacao-por-area` mostra o item a quem tem a role atribuída, e ao Owner sempre) — mas o acesso real ao dado é sempre validado por `user_type`, nunca pela role, já que `societario-schema` não compõe suas policies com `has_role(...)`.

## Goals / Non-Goals

**Goals:**
- Dar aos 3 sócios um painel único para os 4 assuntos societários hoje só documentados em markdown.
- Deixar explícito, na própria UI, quando um dado é "estado atual" vs. "histórico" (mesma distinção já aplicada em Precificação).
- Tornar visível e acionável o acompanhamento dos gatilhos de migração e do teto do MEI, que hoje exigem leitura manual do `camu-docs` para saber "onde estamos".

**Non-Goals:**
- Qualquer automação que dispare uma ação do sistema ao atingir um gatilho ou o teto do MEI — a UI apenas informa, a decisão de agir é humana.
- Upload de documento assinado do acordo de sociedade como arquivo (fica como referência textual nesta fase, conforme já decidido em `societario-schema`).
- Edição de entradas do log de decisões — é append-only, refletindo o schema.

## Decisions

### 1. Uma área "Societário" com 4 sub-rotas, sem sub-navegação complexa
Diferente de Financeiro (Precificação) e Produção (Catálogo + Estoque), que cresceram para múltiplas sub-áreas, Societário nasce com as 4 telas já definidas de uma vez — usa uma sub-navegação simples em abas (Acordo / Enquadramento / Faturamento / Decisões) dentro de `(dashboard)/societario`, mesmo padrão já estabelecido nas fases anteriores.

### 2. Painel de gatilhos como cards de status, não uma tabela
Os 4 gatilhos de migração são exibidos como cards individuais (um por gatilho) com status visual (pendente/atingido), data de quando foi atingido (se aplicável) e um botão de ação — mais legível que uma tabela para um conjunto pequeno e fixo de 4 itens que os sócios devem revisar periodicamente, não filtrar/buscar.

### 3. Faturamento x teto como indicador de progresso + tabela mensal
A tela de faturamento combina um indicador de progresso (percentual do teto atingido nos últimos 12 meses, com destaque visual quando ultrapassar 80% — mesmo limiar citado em `controle-financeiro.md`) com uma tabela simples de lançamentos mensais, destacando em vermelho/aviso os meses de referência sem lançamento dentro da janela de 12 meses. **Alternativa considerada**: só o indicador agregado, sem a tabela mensal. Rejeitada porque a tabela é o que permite identificar rapidamente um mês esquecido, que distorceria o cálculo do indicador.

### 4. Log de decisões como formulário + timeline, replicando o formato do `camu-docs`
A listagem usa o mesmo layout de "timeline" do `log-decisoes.md` (mais recente no topo, cada entrada com Contexto/Decisão/Alternativas/Motivo visualmente separados) — para que um sócio acostumado a ler o arquivo markdown reconheça a mesma estrutura na tela, reduzindo a curva de adaptação.

### 5. Acesso condicionado a `user_type`, não à role, refletido explicitamente na UI
Mesmo que um `member` eventualmente tenha a role `societario` atribuída por engano (erro de configuração do Owner), a UI (e o guard de rota) verificam `user_type in ('owner','socio')` antes de renderizar qualquer conteúdo — a role só decide se o item aparece na sidebar para um Sócio com o toggle "minhas áreas" ativo, nunca decide acesso ao dado. **Motivo**: consistente com a decisão já tomada em `societario-schema` (RLS não composta com `has_role`), evita que a UI e o schema divirjam sobre quem pode ver o quê.

## Risks / Trade-offs

- **[Risco]** Cards fixos para exatamente 4 gatilhos não escalam se um 5º gatilho for adicionado depois (exigiria mudança de schema + UI juntas). → **Mitigação**: aceito conscientemente — a lista de gatilhos é uma decisão de negócio rara e documentada; se crescer, revisar layout junto da migration do schema.
- **[Risco]** Destaque de "mês sem lançamento" na tabela de faturamento depende de o usuário realmente abrir a tela periodicamente — não há notificação proativa (mesma limitação já aceita em `estoque-telas` para o indicador de estoque baixo, por falta de canal assíncrono no painel). → **Mitigação**: aceito; revisitar quando o painel ganhar algum canal de notificação.

## Migration Plan

1. Implementar as telas consumindo os services já existentes (nenhuma migration de banco neste change).
2. Registrar a rota de área para `societario` no registro consumido por `navegacao-por-area`.

## Open Questions

- Se o volume do log de decisões crescer muito (anos de histórico), avaliar paginação da timeline — não necessário na escala atual (poucas decisões por ano).
