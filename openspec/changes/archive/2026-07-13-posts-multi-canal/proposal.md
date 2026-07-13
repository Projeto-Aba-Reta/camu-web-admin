## Why

Na primeira versão do calendário de marketing, um item de planejamento tinha exatamente um canal. Mas a realidade da produção de conteúdo é que a mesma gravação é publicada em várias redes: um vídeo de unboxing vai para Instagram, TikTok e Kwai. Com um canal por item, o mesmo conteúdo virava três cards no board, com três roteiros, três gravações e três edições para acompanhar — triplicando o trabalho de gestão sem que houvesse três produções de verdade.

## What Changes

- **BREAKING** (schema): o canal deixa de ser uma coluna única em `social_content_plan_items` e passa a ser uma lista — um item cobre uma ou mais redes (Instagram, TikTok, YouTube, Kwai, Facebook, Outro).
- Um post continua sendo um único card no board e avança pelo funil `ideia` → ... → `publicado` uma única vez, cobrindo todas as redes selecionadas.
- Todo item tem obrigatoriamente pelo menos um canal.
- No formulário, a seleção de canal vira caixas de seleção com um atalho "Todas as redes" / "Limpar seleção"; board e calendário passam a exibir todos os canais do item.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `calendario-marketing-redes-sociais`: o requirement "Planejamento de posts de redes sociais" passa a exigir **um ou mais** canais por item (antes: um canal), com pelo menos um sempre obrigatório.

## Impact

- **Banco**: nova tabela de junção `social_content_plan_item_channels` (item_id, channel); coluna `channel` removida de `social_content_plan_items`. A migration copia os itens existentes preservando o canal de cada um — nenhum dado se perde.
- **Código**: `SocialContentPlanItem.channels: SocialChannel[]` no lugar de `channel`; repositório carrega e substitui a lista de canais; `SocialContentPlanService` valida "pelo menos um canal" (a tabela de junção não consegue expressar essa regra — ausência de linha é só ausência de linha).
- **UI**: formulário de post com seleção múltipla; badges de canal no board e no calendário.
- **Registro retroativo**: esta change documenta trabalho já implementado e verificado contra o banco local, a pedido do usuário — as tasks nascem marcadas como concluídas.
