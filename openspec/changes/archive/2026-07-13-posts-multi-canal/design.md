## Context

O calendário de marketing (change `calendario-marketing-redes-sociais`, arquivada em 2026-07-13) nasceu com `social_content_plan_items.channel` como coluna única, com check constraint de valores permitidos. Na primeira revisão da tela ficou claro que o modelo não bate com a operação real: uma gravação só é publicada em várias redes, e um canal por item obrigaria a duplicar o mesmo conteúdo em três cards de funil independentes.

## Goals / Non-Goals

**Goals:**
- Um item de planejamento cobre todas as redes em que aquele conteúdo será publicado.
- Um único card no board, que avança pelo funil uma vez só.
- Garantir que nenhum item fique sem canal.
- Preservar os itens já cadastrados na migração.

**Non-Goals:**
- Status por canal (ex. já publicado no TikTok, ainda em edição para o YouTube) — o funil continua sendo do item inteiro. Se essa necessidade aparecer, é outra change.
- Qualquer integração com as redes sociais — `agendado`/`publicado` seguem sendo status manuais.

## Decisions

- **Tabela de junção `social_content_plan_item_channels` (item_id, channel), PK composta**, em vez de coluna `text[]` no item. A PK composta já garante que um canal não se repete no mesmo item, e o check constraint de valores permitidos continua sendo do banco — com um array isso viraria validação só em código. Também segue o padrão que o repo já usa para linhas filhas (ex. `product_slicing_sheet_materials`).
- **"Pelo menos um canal" vive no `SocialContentPlanService`, não no banco.** Uma tabela de junção não consegue expressar cardinalidade mínima: ausência de linha é simplesmente ausência de linha. O schema Zod bloqueia o mesmo caso no formulário, mas a regra do service é a que vale para as Server Actions (que são endpoints independentes da tela).
- **Update substitui a lista inteira de canais** (delete + insert) em vez de fazer diff. A lista tem no máximo seis itens; um diff seria mais código para o mesmo resultado.
- **A migration copia os itens existentes** (`insert ... select id, channel from social_content_plan_items`) antes de dropar a coluna — nenhum item perde seu canal.

## Risks / Trade-offs

- [Trade-off] Cada leitura de itens vira duas queries (itens + canais, juntados em memória), em vez de uma. → Aceito: é o mesmo padrão de `SupabaseSlicingSheetRepository`, e a escala aqui é de dezenas de posts, não milhares.
- [Risco] Um item com muitas redes esconde que o conteúdo pode precisar de cortes diferentes por rede (vertical no TikTok, horizontal no YouTube). → Mitigação: o campo de notas absorve isso nesta versão; status por canal fica registrado como Non-Goal caso vire necessidade real.

## Open Questions

(nenhuma — change registrada retroativamente sobre implementação já verificada)
