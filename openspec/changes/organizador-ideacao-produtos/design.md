## Context

Hoje a ideação de produto é informal — camu-docs (`01-visao-geral/sociedade-e-divisao.md`) só atribui "modelagem (Blender)" ao Sócio A, sem processo de captação/priorização de ideias. O usuário decidiu criar uma role/sub-role própria ("Ideação de Produtos", com um head) em vez de restringir por role já existente (`producao`), reconhecendo que ideação é uma responsabilidade distinta da execução de produção. `gestao-de-roles` já suporta a criação de qualquer role nova pelo Owner sem mudança de schema, então essa parte é só configuração/seed, não uma capability nova.

## Goals / Non-Goals

**Goals:**
- Dar visibilidade às datas comemorativas relevantes para criação de produto, com antecedência para modelar/testar a tempo.
- Organizar ideias de produto por status, prioridade e categoria, com histórico de descartadas.
- Restringir a escrita à role dedicada de Ideação de Produtos (mais owner/socio), permitindo nomear um responsável único por essa frente.

**Non-Goals:**
- Fluxo de aprovação formal entre sócios antes de uma ideia virar produto — o `status = em_desenvolvimento` é suficiente, sem votação/aprovação multi-sócio.
- Vínculo automático entre uma ideia "lançada" e a criação do produto real no catálogo — a transição para o catálogo continua manual (cadastro em `catalogo-de-pecas`), esta capability só referencia a categoria, não cria o produto.
- Definir aqui quem é o responsável/head da role — isso é dado de seed (pessoa real), não requisito de spec.

## Decisions

- **Lista de datas comemorativas própria** (`commemorative_dates_produtos`), sem compartilhar tabela com `calendario-marketing-redes-sociais` — mesma decisão explícita do usuário de manter os dois fluxos desacoplados, mesmo com sobreposição de datas nacionais entre as duas listas.
- **RBAC de escrita restrito à nova role `ideacao-produtos`** (mais owner/socio) — decisão explícita do usuário de criar uma área própria com responsável dedicado, em vez de reaproveitar a role `producao` (que cobre execução, não ideação).
- **Leitura mais aberta que a escrita**: qualquer usuário autenticado pode visualizar as datas e ideias (leitura), já que outros sócios podem se beneficiar de saber o que está sendo pensado para produto, mesmo sem poder editar.
- **Categoria reaproveita o enum `ProductCategory` do catálogo** (`miniatura_colecionavel`, `personalizado`, `utilitario`, `linha_leon`) em vez de criar uma taxonomia nova — mantém consistência com o catálogo real, já que uma ideia lançada vira um produto dessas mesmas categorias.

## Risks / Trade-offs

- [Trade-off] Duas listas de datas comemorativas (esta e a de marketing) podem divergir → Aceito conscientemente pelo usuário, mesmo trade-off já assumido na proposta de marketing.
- [Risco] Sem vínculo automático com o catálogo, uma ideia "lançada" pode ficar sem produto correspondente cadastrado (inconsistência manual) → Mitigação: aceito nesta versão; o campo de status serve como lembrete/checklist, não como automação.

## Open Questions

- A leitura das ideias deve ser irrestrita a qualquer usuário autenticado ou só a owner/socio/role ideacao-produtos? Assumido nesta proposta: irrestrita a qualquer usuário autenticado, a confirmar na implementação.
