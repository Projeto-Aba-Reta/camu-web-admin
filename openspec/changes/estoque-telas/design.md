## Context

O schema de estoque (`estoque-schema`) já existe, com saldo sempre derivado das movimentações (nunca um campo editável) e vínculo opcional entre consumo de insumo e produção de peça pronta. A área `producao` da sidebar já foi registrada por `catalogo-telas` — este change adiciona sub-rotas dentro dela, sem criar um novo item de navegação principal.

## Goals / Non-Goals

**Goals:**
- Tornar o registro de movimentação simples o suficiente para ser preenchido no dia a dia da produção, sem fricção que leve a pular o lançamento.
- Reduzir o risco de esquecer o segundo lado do processo (consumo de insumo sem registrar a peça pronta correspondente) oferecendo o vínculo como fluxo padrão sugerido.
- Tornar o alerta de estoque baixo visível sem exigir navegação ativa até a tela de estoque.

**Non-Goals:**
- Edição ou exclusão de uma movimentação já registrada — o log é append-only; correção de erro é feita por uma nova movimentação de `ajuste_manual`, nunca editando a original.
- Relatórios/gráficos de consumo histórico — fica para uma fase futura de analytics, fora deste roadmap de 4 fases.
- Baixa automática de peça pronta por integração de venda — a saída por venda continua manual nesta primeira versão.

## Decisions

### 1. Formulário de consumo em produção com vínculo de peça pronta como padrão sugerido, não obrigatório
Ao abrir o formulário de "Registrar consumo em produção", o campo "Peça produzida" (opcional) já vem com foco e uma dica visual de que preenchê-lo também gera a entrada de peça pronta automaticamente — mas o formulário aceita ser enviado sem esse campo (produção ainda em andamento). **Alternativa considerada**: dois formulários totalmente separados (consumo de insumo / entrada de peça pronta) sem nenhuma ligação na UI. Rejeitada porque o fluxo real mais comum é "imprimi, gastei X de filamento, e a peça já saiu pronta" — separar completamente aumentaria a chance de esquecer o segundo lançamento, que é justamente o risco que o vínculo opcional do schema foi desenhado para mitigar.

### 2. Correção de lançamento incorreto via `ajuste_manual`, nunca edição
Não existe botão de editar/excluir uma movimentação na UI. Um lançamento incorreto é corrigido registrando uma nova movimentação de `ajuste_manual` com a diferença (positiva ou negativa) e uma nota obrigatória explicando o motivo. **Motivo**: preserva a garantia de auditoria do schema (append-only) — permitir edição na UI abriria uma porta que o schema deliberadamente fechou.

### 3. Indicador de estoque baixo na topbar como contador simples
Um badge na topbar (visível a Owner/Sócio/`producao`) mostra a contagem de insumos atualmente abaixo do limite mínimo, com link direto para a tela de insumos filtrada por "estoque baixo". **Alternativa considerada**: notificação push/e-mail. Fora de escopo nesta fase — o painel ainda não tem canal de notificação assíncrona (WhatBot é automação de atendimento ao cliente, fora do escopo deste repositório); um indicador visual na própria sessão já resolve o caso de uso de quem acessa o painel regularmente.

### 4. Peça pronta sem alerta, com saldo simplesmente exibido
A tela de estoque de peças prontas mostra o saldo disponível por peça (herdado de `product_stock_balances`) sem nenhum indicador de "baixo" — consistente com a decisão do schema de que só insumo tem limite configurável nesta fase.

### 5. Sub-navegação dentro da área Produção
Dentro de `(dashboard)/producao`, um sub-menu ou abas simples alternam entre "Catálogo" (de `catalogo-telas`) e "Estoque" (Insumos / Peças Prontas) — reaproveitando o padrão de sub-navegação já estabelecido por `precificacao-telas` dentro da área Financeiro (Calcular / Configuração / Histórico).

## Risks / Trade-offs

- **[Risco]** Sem edição de movimentação, um erro de digitação (ex.: quantidade errada) exige duas entradas (a errada + o ajuste) em vez de uma correção direta. → **Mitigação**: aceito conscientemente — é o mesmo trade-off já aceito no schema em nome de auditoria; a UI documenta esse comportamento com uma mensagem explicativa perto do formulário.
- **[Risco]** Badge de estoque baixo na topbar pode ficar "sempre vermelho" se os limites forem configurados de forma muito conservadora, perdendo o efeito de alerta. → **Mitigação**: fica registrado como responsabilidade do usuário calibrar limites realistas; não é um problema de schema/UI.

## Migration Plan

1. Implementar as telas consumindo os services já existentes (nenhuma migration de banco neste change).
2. Adicionar as sub-rotas dentro de `(dashboard)/producao/estoque/**`.
3. Adicionar o badge de estoque baixo ao componente de topbar já existente do shell.

## Open Questions

- Se o volume de movimentações por dia crescer a ponto de a listagem ficar pesada, avaliar paginação/infinite scroll — não necessário na escala atual (operação artesanal, poucos lançamentos por dia).
