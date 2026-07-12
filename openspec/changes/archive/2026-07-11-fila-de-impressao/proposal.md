## Why

Hoje a produção acontece sem nenhum registro estruturado: não há como saber o que está na fila para imprimir, qual impressora está ocupada, nem quando uma peça termina de ser impressa — isso é feito de cabeça ou fora do sistema. Isso também deixa o estoque de peças prontas e de insumos (filamento) desatualizado, já que a entrada/baixa depende de lançamento manual depois do fato. Esta mudança cria uma fila de impressão dentro do painel: o usuário escolhe um ou mais produtos do catálogo, clica em play para iniciar a impressão numa impressora do parque, e ao concluir o sistema atualiza os estoques automaticamente e avisa a equipe via Slack.

## What Changes

- Nova fila de impressão: itens são adicionados a partir do catálogo (produto + quantidade + material/cor de filamento a ser usado), com status `na_fila` → `imprimindo` → `concluido`, ou `na_fila`/`imprimindo` → `cancelado`.
- Ação "play": inicia a impressão de um item, atribuindo uma impressora ativa do parque. O sistema sugere por padrão uma impressora ociosa (sem nenhum item `imprimindo` no momento); o usuário pode escolher outra impressora ativa manualmente. Uma impressora não pode ter dois itens `imprimindo` ao mesmo tempo.
- Ação "concluir": ao marcar um item como concluído, o sistema automaticamente (a) lança uma movimentação de entrada em estoque de peças prontas para o produto/quantidade, (b) lança uma movimentação de baixa em estoque de insumos para o material/cor de filamento usado (peso do produto × quantidade), e (c) envia uma notificação no Slack com produto, quantidade, impressora e duração da impressão.
- **Nova integração**: envio de notificações para o Slack via webhook (não existe nenhuma integração com Slack no sistema hoje).
- Nova tela em `/producao/fila-de-impressao` para montar a fila, iniciar, concluir e cancelar itens.

## Capabilities

### New Capabilities
- `fila-de-impressao`: fila de itens de produção vinculados ao catálogo, com ciclo de vida na_fila/imprimindo/concluido/cancelado, atribuição de impressora do parque no início, baixa automática de estoque (peça pronta + insumo) na conclusão, e notificação via Slack.

### Modified Capabilities
(nenhuma — os requisitos já existentes de `estoque-de-pecas-prontas` e `movimentacao-de-estoque-de-insumos` não mudam; esta mudança apenas passa a gerar movimentações neles a partir de um novo evento.)

## Impact

- **Domínio de gestão afetado**: Produção (fila de produção, hoje já citada como escopo do painel em `openspec/config.yaml`, mas sem spec própria).
- **Dependência com camu-docs**: não depende de camu-docs para os requisitos funcionais desta fila (funcionalidade nova, sem base documental prévia lá) — mas reutiliza dados já semeados a partir de camu-docs (impressora Ender-3 V3 SE cadastrada em `parque-de-impressoras`, catálogo/insumos já existentes).
- **Banco**: nova tabela para os itens da fila; nenhuma alteração nas tabelas existentes de estoque/catálogo/impressoras, só novos registros de movimentação gerados por elas.
- **Novo componente de infraestrutura**: cliente/serviço de notificação Slack (webhook configurável por variável de ambiente), usado apenas por esta capability por enquanto.
- **UI**: nova rota/tela em `/producao/fila-de-impressao`, nova entrada na navegação de Produção.
