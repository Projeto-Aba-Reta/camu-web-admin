## Why

O sócio responsável por marketplace/vendas hoje não tem, dentro do painel, nenhuma visão das datas comemorativas relevantes para o negócio nem de onde estão os posts das redes sociais no funil de produção de conteúdo (ideia → roteiro → gravação → edição → publicação). Isso é hoje gerenciado fora do sistema (ou de cabeça), o que dificulta planejar com antecedência campanhas ligadas a datas como Natal, Dia das Mães ou Black Friday — datas que, segundo `camu-docs/06-marketplace/estrategia-canais.md`, já são relevantes para a estratégia de canais (ex. TikTok Shop exige conteúdo/vídeo constante).

## What Changes

- Novo calendário de datas comemorativas voltado a marketing/redes sociais (nome, data ou regra de recorrência, categoria, ativa/inativa).
- Novo planejamento de conteúdo/posts de redes sociais: cada post com título, canal (Instagram, TikTok, etc.), status (`ideia` → `roteiro` → `gravacao` → `edicao` → `agendado` → `publicado`), responsável, data alvo e notas, podendo ser vinculado a uma data comemorativa.
- Tela com visão de calendário mensal (datas comemorativas + posts) e visão de board por status, para acompanhar o que falta gravar/editar/publicar.
- Esta capability é **independente** do organizador de ideação de produtos por data comemorativa (proposta separada `organizador-ideacao-produtos`) — cada uma mantém sua própria lista de datas, por decisão explícita de manter os dois fluxos desacoplados.

## Capabilities

### New Capabilities
- `calendario-marketing-redes-sociais`: lista de datas comemorativas voltada a marketing e planejamento de posts de redes sociais (funil ideia → publicado), com visão de calendário e de board.

### Modified Capabilities
(nenhuma)

## Impact

- **Domínio de gestão afetado**: Vendas/canais (Marketplace/Vendas) — reaproveita a role `marketplace-vendas` já semeada, já que camu-docs liga estratégia de conteúdo/redes sociais à operação de marketplace.
- **Dependência com camu-docs**: parcial — a menção a conteúdo/vídeo constante e parceria com micro-influenciadores em `06-marketplace/estrategia-canais.md` motiva a necessidade, mas camu-docs não tem uma lista de datas comemorativas nem um modelo de funil de conteúdo; ambos são desenhados do zero nesta proposta.
- **Banco**: duas tabelas novas (`commemorative_dates_marketing`, `social_content_plan_items`); nenhuma alteração em tabelas existentes.
- **UI**: nova rota dentro da área Marketplace/Vendas para o calendário/planejamento de conteúdo.
