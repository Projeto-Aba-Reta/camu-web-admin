## Context

O painel já cobre precificação (parque de impressoras, custo), catálogo e estoque (peças prontas/insumos), mas nenhuma dessas telas registra o ato de imprimir em si — é um passo manual fora do sistema. O parque de impressoras (`printers`) só existe hoje como cadastro de custo (nome, modelo, depreciação/hora, `is_active`), sem noção de disponibilidade em tempo real. Hoje só há uma impressora ativa (Ender-3 V3 SE), mas o roadmap already prevê Creality K1 Max e Bambu Lab A1 Combo, então o desenho precisa suportar múltiplas impressoras desde já. Não existe nenhuma integração de notificação (Slack ou outra) no repositório.

## Goals / Non-Goals

**Goals:**
- Permitir montar uma fila de produtos do catálogo para imprimir, com quantidade e material/cor de filamento.
- Iniciar (play) e concluir impressões, com sugestão automática de impressora ociosa.
- Fechar o ciclo produção → estoque automaticamente na conclusão (peça pronta + baixa de insumo).
- Notificar a equipe no Slack quando uma impressão termina.

**Non-Goals:**
- Integração real com firmware/API de impressora (ex. Klipper/Moonraker, OctoPrint) para detectar progresso ou término automaticamente — a transição de status é sempre uma ação manual do usuário ("play"/"concluir").
- Estimativa de tempo restante em tempo real durante a impressão (o `printHours` de `price_calculations` já existe para referência, mas não há contador ao vivo nesta versão).
- Fila por assinante/lote (mencionada no roadmap de assinatura recorrente) — este design cobre só a fila de produção geral do catálogo.

## Decisions

- **Fila única, sem impressora fixa por item**: o item nasce em `na_fila` sem impressora atribuída; a impressora só é definida no momento do "play". Alternativa considerada: fila por impressora (item já entra atribuído) — rejeitada porque hoje só há 1 impressora ativa e forçar a escolha cedo demais geraria retrabalho quando a fila for montada antes de saber qual máquina estará livre.
- **"Ociosa" é estado derivado, não persistido**: calculado em tempo de leitura como "impressora ativa sem nenhum item da fila em status `imprimindo`". Alternativa considerada: coluna `status` em `printers` (ocioso/ocupado) — rejeitada por criar uma segunda fonte de verdade que precisaria ser mantida em sincronia com a fila a cada transição; deriving evita esse risco.
- **Uma impressora só imprime um item por vez**: validado na transição para `imprimindo` (rejeita se já houver outro item `imprimindo` com a mesma `printer_id`). Simples e suficiente, já que impressoras físicas realmente só imprimem uma peça de cada vez.
- **Baixa de estoque automática e transacional na conclusão**: ao concluir, a mesma operação cria a movimentação de peça pronta (`product_stock_movements`, tipo `producao`) e a de insumo (`material_stock_movements`, tipo `consumo_producao`, quantidade = peso do produto em `price_calculations.weightGrams` × quantidade do item). Reaproveita os serviços já existentes (`InventoryService`), não duplica lógica de ledger.
- **Notificação Slack via webhook simples**: um serviço novo (`SlackNotificationService` ou equivalente) faz um POST para uma URL de Incoming Webhook configurada por variável de ambiente (ex. `SLACK_WEBHOOK_URL`). Alternativa considerada: Slack App/Bot token com API completa — rejeitada por ser desproporcional ao caso de uso (uma mensagem simples de "impressão concluída"); webhook de entrada é mais simples de configurar e não exige criar um Slack App.
- **Falha no Slack não deve travar a conclusão**: se o POST ao webhook falhar (rede, URL não configurada), a conclusão da impressão e as movimentações de estoque são confirmadas normalmente; a falha de notificação é apenas logada. Rationale: a notificação é um "nice-to-have" de visibilidade, não deve bloquear o fechamento do ciclo de produção/estoque.

## Risks / Trade-offs

- [Risco] Não há proteção contra o usuário selecionar manualmente uma impressora que já está com outro item em `imprimindo` → Mitigação: validação de exclusividade no service, retornando erro amigável ("Impressora X já está imprimindo outro item").
- [Risco] Peso do produto pode não estar disponível (produto sem `price_calculations` vinculado) → Mitigação: só permitir adicionar à fila produtos com cálculo de preço vinculado (mesma pré-condição já usada por `disponibilidade-por-canal`).
- [Trade-off] Sem integração real com a impressora, o sistema não sabe se a impressão realmente terminou ou falhou fisicamente — depende do usuário marcar "concluir" corretamente. Aceitável para o estágio atual (operação artesanal, poucas máquinas).
- [Risco] `SLACK_WEBHOOK_URL` não configurado em um ambiente (ex. local/dev) → Mitigação: notificação vira no-op silencioso (log de aviso), não erro, consistente com o objetivo do seed geral de funcionar sem configuração adicional.

## Open Questions

- Leitura da fila deve ser liberada para a role `financeiro` (só leitura, para acompanhar volume de produção) ou fica restrita a `producao`/`owner`/`socio`? Assumido nesta proposta: leitura também para `financeiro`, a confirmar na implementação.
- Deve haver um limite de itens simultâneos `na_fila` ou é ilimitado? Assumido: ilimitado nesta versão.
