## Context

`fila-de-impressao` (implementado e arquivado antes desta proposta) hoje modela o consumo de insumo de forma simplificada: 1 material por item, escolhido manualmente pelo usuário ao adicionar à fila, com a quantidade consumida calculada a partir de `price_calculations.weightGrams` (peso agregado, sem distinguir cor nem suporte). `calculo-de-preco-por-peca` (`price_calculations`) é um snapshot imutável do motor de cálculo de preço (peso + tempo + impressora → custo/preço sugerido) — não é um cadastro editável, e não tem noção de múltiplas cores.

Este change introduz um cadastro novo e editável, ligado à peça do catálogo: a **ficha de fatiamento**, com os dados reais exportados pela fatiadora (slicer) por combinação peça+impressora — lista de filamentos usados (peça + suporte, por cor) e tempo de impressão. `fila-de-impressao` passa a consumir esse cadastro em vez de pedir escolha manual de material, e ganha duas capacidades novas: cronômetro visível e conclusão automática por tempo, via job agendado no servidor.

Não existe hoje, no projeto, nenhuma rotina disparada por tempo (cron) — todas as ações são disparadas por usuário. Este é o primeiro caso.

## Goals / Non-Goals

**Goals:**
- Cadastrar, por peça e por impressora, a lista de filamentos usados (cor + gramas na peça + gramas em suporte) e o tempo de impressão gerado pela fatiadora.
- `fila-de-impressao` deriva automaticamente os materiais e quantidades a consumir a partir da ficha vinculada, em vez de escolha manual de 1 material.
- Exibir cronômetro regressivo por item `imprimindo`, calculado a partir do tempo da ficha.
- Concluir automaticamente uma impressão vencida via job agendado no servidor, gerando as mesmas movimentações de estoque e notificação Slack da conclusão manual — sem depender de nenhum navegador aberto.

**Non-Goals:**
- Integrar a ficha de fatiamento ao motor de cálculo de preço (`calculo-de-preco-por-peca` continua recebendo peso/tempo manualmente no formulário de cálculo; preencher esse formulário a partir da ficha fica para uma iteração futura).
- Importação automática do arquivo de projeto da fatiadora (`.3mf`/`.gcode`) — o cadastro é manual, digitando os números que a fatiadora mostrou.
- Detecção real de progresso de impressão via firmware/API da impressora (Klipper/Moonraker, OctoPrint) — a conclusão automática é uma estimativa por tempo decorrido, não uma leitura real de sensor.
- Escolher a infraestrutura de agendamento definitiva (ver Decisão "Execução do job agendado é desacoplada do provedor de cron").

## Decisions

- **Ficha de fatiamento é uma capability nova, não uma extensão de `price_calculations`**: `price_calculations` é um snapshot imutável do motor de custo (nunca editado, existe para auditoria histórica de preço). A ficha de fatiamento é um cadastro vivo — o usuário reedita quando refatia a peça. Forçar isso em `price_calculations` quebraria a garantia de imutabilidade já documentada naquela capability. Alternativa considerada: adicionar colunas de múltiplos materiais a `price_calculations` — rejeitada pelo motivo acima.
- **Uma ficha por combinação peça+impressora, mutável in-place**: `product_slicing_sheets (product_id, printer_id)` único; reeditar/refatiar a mesma peça na mesma impressora atualiza a ficha existente (mesmo padrão de `materials`), não cria histórico. Diferente de `price_calculations`, não há necessidade de auditoria histórica de fichas — o que importa é o valor atual para a próxima impressão. As linhas de material (`product_slicing_sheet_materials`) são substituídas por completo a cada edição (delete + insert), não editadas linha a linha, simplificando o formulário (lista completa reenviada).
- **Peso da peça é derivado, não armazenado**: "quanto pesa a peça" = soma de `piece_grams` de todas as linhas da ficha. Gramas de suporte (`support_grams`) são contabilizadas separadamente por linha porque são consumidas do estoque de insumo mas não fazem parte do peso físico final da peça (relevante para uma futura tela de peso para frete). Alternativa considerada: um único campo `total_grams` por linha sem separar suporte — rejeitada porque perderia a distinção que o usuário pediu explicitamente.
- **`fila-de-impressao` continua escolhendo a impressora só no "play"**, não na criação do item — preserva a decisão original já validada (evitar retrabalho de escolher impressora cedo demais). O que muda: ao adicionar à fila, a peça precisa ter pelo menos uma ficha cadastrada (para qualquer impressora); ao iniciar ("play"), a lista de impressoras candidatas é filtrada às que têm ficha cadastrada para aquela peça — a sugestão de "impressora ociosa" passa a considerar apenas essas. Alternativa considerada: mover a escolha de impressora para o momento de adicionar à fila (já que a ficha é por peça+impressora) — rejeitada por reintroduzir o mesmo retrabalho que a decisão original evitou (a fila é montada antes de saber qual máquina estará livre).
- **Ficha é snapshotada no item da fila no momento do "play"**: ao iniciar, o sistema copia as linhas da ficha (material, peça+suporte em gramas) e o tempo de impressão para o próprio item da fila (`print_queue_item_materials` + `print_queue_items.expected_finish_at = started_at + tempo_da_ficha`). Mesmo racional de `price_calculations` ser um snapshot imutável: se o usuário reeditar a ficha enquanto uma impressão já está `imprimindo`, o item em andamento não pode mudar de baixo dos pés do usuário — ele conclui com os números que tinha quando começou.
- **Conclusão automática reaproveita `PrintQueueService.completePrinting`, adaptado para múltiplos materiais**: tanto o job agendado quanto o botão "Concluir" manual chamam o mesmo método de service, evitando duas implementações da regra de negócio (baixa de estoque multi-material + notificação Slack). O job só decide **quando** chamar (itens `imprimindo` com `expected_finish_at <= now()`); a lógica de "o que fazer ao concluir" continua uma responsabilidade só do service.
- **Execução do job agendado é desacoplada do provedor de cron**: a lógica vive numa rota HTTP server-side (`POST /api/cron/complete-print-queue`) protegida por um segredo compartilhado (header `Authorization: Bearer <CRON_SECRET>`), não numa function de banco (rejeitamos `pg_cron`/`pg_net` do Postgres para não duplicar a regra de negócio, hoje em TypeScript no service layer, dentro do banco). Qual mecanismo efetivamente chama essa rota em produção (Vercel Cron, GitHub Actions agendado, ou outro) é uma decisão de infraestrutura de deploy, não de código — ver Open Questions. A rota funciona standalone e pode ser testada com `curl` independente do agendador escolhido.
- **Cronômetro é só exibição no cliente; a verdade sobre "concluído" é sempre decidida no servidor**: o cliente calcula `expected_finish_at - now()` localmente (via `setInterval`) só para mostrar "faltam Xmin". Nenhuma ação de conclusão é disparada pelo cliente ao chegar a zero — ele só passa a atualizar a página com mais frequência (polling leve) até o item sumir de `imprimindo` (confirmando que o job já rodou). Evita a inconsistência de dois caminhos de conclusão (cliente e servidor) competindo.

## Risks / Trade-offs

- [Risco] Produtos e itens de fila já existentes (do change `fila-de-impressao` já implementado) referenciam `material_id` direto em `print_queue_items` e não têm ficha de fatiamento cadastrada → Mitigação: ver Migration Plan — projeto ainda não tem uso em produção, então a migration substitui a coluna sem necessidade de backfill; times futuros que já tenham peças cadastradas precisarão cadastrar a ficha antes de voltar a usar a fila.
- [Risco] Job agendado não configurado/não disparado no ambiente (ex.: local, ou provedor de cron mal configurado em produção) → Mitigação: a conclusão manual continua funcionando exatamente como hoje; a automação é um complemento, não uma dependência dura do fluxo.
- [Risco] Relógio do cliente desalinhado com o servidor pode fazer o cronômetro mostrar um tempo levemente incorreto → Mitigação: aceitável, é só uma exibição informativa; a decisão real de "venceu o prazo" é sempre feita no servidor comparando `now()` do Postgres/Node com `expected_finish_at`.
- [Trade-off] Igual ao `fila-de-impressao` original, não há integração real com a impressora — a conclusão automática por tempo é uma estimativa (tempo da fatiadora), não uma confirmação física de que a peça realmente terminou sem erro. Uma impressão que falhar antes do tempo estimado (peça caiu, filamento acabou) só é corrigida manualmente via cancelamento — mesma limitação já aceita no change anterior.

## Migration Plan

1. Criar `product_slicing_sheets` e `product_slicing_sheet_materials` (novas tabelas, sem impacto em dados existentes).
2. Alterar `print_queue_items`: remover `material_id` (a baixa de insumo passa a vir do snapshot em `print_queue_item_materials`), adicionar `expected_finish_at timestamptz null`. Como o projeto ainda não tem ambiente de produção com dados reais (`README.md`: "fase de fundação"), a migration pode alterar a coluna diretamente, sem estratégia de backfill/rollback de dados.
3. Criar `print_queue_item_materials` (linhas snapshotadas no "play").
4. Deploy da rota `/api/cron/complete-print-queue` (funciona mesmo sem agendador configurado — precisa ser chamada manualmente ou por um agendador para ter efeito).
5. Configurar o agendador escolhido (fora do escopo de código deste change — ver Open Questions) apontando para a rota acima, com o segredo `CRON_SECRET`.

## Open Questions

- Qual provedor de cron será usado em produção (Vercel Cron, GitHub Actions agendado, outro)? A rota HTTP é agnóstica a isso, mas o `vercel.json` (se for Vercel Cron) precisa ser adicionado nesta implementação ou fica para o deploy — assumido nesta proposta: incluir um `vercel.json` de exemplo como default (mais comum para Next.js), mas sem travar a implementação a ele.
- Qual a frequência ideal do job (1min? 5min?) — trade-off entre atraso na baixa de estoque/notificação e custo de invocações. Assumido nesta proposta: 5 minutos, ajustável depois sem mudança de código (só na config do agendador).
- RBAC da ficha de fatiamento: assumido igual ao catálogo (`catalogo-de-pecas`) já que o cadastro fica na mesma tela do produto — leitura ampla (Produção/Financeiro/Vendas), escrita só Produção/Owner/Sócio. A confirmar se Vendas realmente precisa ver detalhes de fatiamento (provavelmente não, mas manter a mesma regra da tela evita um terceiro guard de RBAC só para isso).
