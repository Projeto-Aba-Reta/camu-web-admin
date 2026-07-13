## Context

A role `marketplace-vendas` já existe e cobre, segundo camu-docs, a operação de marketplace (atendimento, fotos, logística) do sócio responsável — que é também quem, na prática, cuidaria de redes sociais. Não existe hoje nenhuma modelagem de datas comemorativas nem de funil de conteúdo no sistema. O organizador de ideação de produtos (proposta separada) também usa datas comemorativas, mas para um propósito diferente (decidir o que desenvolver, não o que postar); por decisão do usuário, as duas listas de datas são mantidas separadas para não acoplar os dois fluxos.

## Goals / Non-Goals

**Goals:**
- Dar visibilidade às datas comemorativas relevantes para marketing, com antecedência suficiente para planejar.
- Acompanhar o funil de produção de cada post (ideia → roteiro → gravação → edição → agendado → publicado) e quem é responsável por cada etapa.
- Oferecer uma visão de calendário (quando cada coisa acontece) e uma visão de board (o que está parado em qual etapa).

**Non-Goals:**
- Publicação automática ou agendamento direto nas redes sociais (nenhuma integração com Meta/TikTok/etc. — o campo "agendado" é só um status manual).
- Métricas de performance de post (engajamento, alcance) — fica fora, é só planejamento.
- Aprovação/fluxo de revisão multi-etapa formal — o campo "responsável" e "status" são suficientes nesta versão.

## Decisions

- **Lista de datas comemorativas própria desta capability** (`commemorative_dates_marketing`), sem compartilhar tabela com o organizador de ideação de produtos — decisão explícita do usuário para manter os dois fluxos totalmente desacoplados, mesmo com alguma duplicação de datas nacionais entre as duas listas.
- **Post vinculado a uma data comemorativa é opcional**: nem todo post é ligado a uma data (ex. conteúdo de bastidores, resposta a tendência) — `commemorative_date_id` é nullable em `social_content_plan_items`.
- **Status como enum fixo de funil linear** (ideia/roteiro/gravacao/edicao/agendado/publicado) em vez de campo livre — mantém a visão de board simples e comparável com o padrão de status já usado em outras specs do repo (ex. status de peça no catálogo).
- **RBAC reaproveita a role `marketplace-vendas`** já semeada, em vez de criar uma role nova de "Marketing" — evita fragmentar ainda mais as áreas de sócio quando a responsabilidade já está coberta pela role existente.

## Risks / Trade-offs

- [Trade-off] Duas listas de datas comemorativas (esta e a de ideação de produtos) podem divergir com o tempo (ex. uma atualizada, outra não) → Aceito conscientemente pelo usuário como preço de manter os fluxos desacoplados.
- [Risco] Sem integração com as redes sociais, o status "publicado" depende de atualização manual e pode ficar desatualizado → Mitigação: aceito como limitação desta primeira versão, consistente com o objetivo de planejamento (não de execução automatizada).

## Open Questions

- A visão de calendário deve mostrar só o mês corrente ou permitir navegar meses futuros/passados livremente? Assumido: navegação livre entre meses, como qualquer calendário mensal padrão.
