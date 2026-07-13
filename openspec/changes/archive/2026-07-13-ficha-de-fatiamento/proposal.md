## Why

Hoje o cadastro de uma peça do catálogo só guarda um peso e um tempo agregados (via `price_calculations`), sem refletir o que a fatiadora (slicer) realmente informa: quanto de cada cor de filamento é gasto na peça em si, quanto é desperdiçado em suporte, e que o tempo de impressão varia por impressora/perfil de fatiamento. Isso força a fila de impressão a depender de o usuário escolher manualmente 1 material por item (sem suporte a peças multicoloridas) e não permite calcular automaticamente quando uma impressão deve terminar — hoje a conclusão é sempre uma ação manual, mesmo que a peça já tenha, na prática, terminado de imprimir sem ninguém com o painel aberto para confirmar.

## What Changes

- Nova **ficha de fatiamento**: cadastro, por peça do catálogo e por impressora, dos dados exportados pela fatiadora — lista de filamentos usados (material/cor + gramas na peça + gramas em suporte) e tempo de impressão para aquela impressora específica. Uma peça pode ter fichas para mais de uma impressora (ex.: fatiada tanto para a Ender-3 V3 SE quanto para a Bambu Lab A1 Combo).
- **`fila-de-impressao` (MODIFIED)**: adicionar um item à fila passa a exigir uma ficha de fatiamento vinculada à peça (em vez de escolha manual e livre de 1 material); a conclusão gera movimentações de baixa de estoque para **cada** material da ficha (peça + suporte), não mais um único material.
- **`fila-de-impressao` (MODIFIED)**: a tela passa a exibir um cronômetro por item `imprimindo` (calculado a partir de `started_at` + tempo de impressão da ficha de fatiamento da impressora usada).
- **`fila-de-impressao` (MODIFIED)**: conclusão automática — um job agendado no servidor conclui um item `imprimindo` quando o tempo estimado se esgota, gerando as mesmas movimentações de estoque e a mesma notificação Slack da conclusão manual, sem depender de nenhum navegador aberto.

## Capabilities

### New Capabilities
- `ficha-de-fatiamento`: cadastro, por peça do catálogo e por impressora, da lista de filamentos usados (material/cor, gramas na peça, gramas em suporte) e do tempo de impressão gerado pela fatiadora para aquela impressora.

### Modified Capabilities
- `fila-de-impressao`: adicionar um item exige ficha de fatiamento vinculada (produto + impressora); conclusão gera movimentações de baixa para múltiplos materiais (um por linha da ficha) em vez de um único material; a tela exibe cronômetro regressivo por item `imprimindo`; conclusão passa a poder ocorrer automaticamente por um job agendado no servidor quando o tempo estimado se esgota, além da conclusão manual já existente.

## Impact

- **Domínio de gestão afetado**: Produção (catálogo e fila de produção).
- **Dependência com camu-docs**: não depende de documentação nova de camu-docs — reutiliza o parque de impressoras e o catálogo já existentes.
- **Banco**: novas tabelas para a ficha de fatiamento (cabeçalho por produto+impressora + linhas de material/gramas); `print_queue_items` deixa de ter um único `material_id`/`quantity` de consumo — a baixa de insumo passa a ser derivada das linhas da ficha vinculada; nenhuma tabela existente de catálogo, estoque ou impressoras é removida.
- **Backend**: novo repositório/serviço de ficha de fatiamento; `PrintQueueService.addToQueue`/`completePrinting` passam a operar em cima de múltiplos materiais; novo endpoint/rotina server-side executada por um job agendado (cron) para concluir impressões vencidas.
- **UI**: nova seção de cadastro de ficha de fatiamento na tela de detalhe da peça do catálogo (`/producao/catalogo/[productId]`); tela da fila de impressão (`/producao/fila-de-impressao`) ganha cronômetro por item `imprimindo` e reflete a baixa de múltiplos materiais na conclusão.
- **Infraestrutura**: novo mecanismo de execução agendada (cron) — primeira vez que o projeto precisa de uma rotina server-side disparada por tempo, não por ação de usuário.
