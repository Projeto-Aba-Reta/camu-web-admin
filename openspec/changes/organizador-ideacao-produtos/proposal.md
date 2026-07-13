## Why

O fluxo de ideação de novos produtos (autorais, ligados a datas comemorativas como Natal, Dia dos Pais, Dia das Mães) hoje não tem nenhum registro estruturado no painel — fica só na cabeça do sócio responsável pela modelagem/produção. Sem um organizador dedicado, é fácil perder o timing de desenvolvimento de peças sazonais (que precisam ser modeladas e testadas com meses de antecedência da data em si) e não há histórico de ideias descartadas ou já lançadas.

## What Changes

- Novo organizador de ideação de produtos: lista de datas comemorativas relevantes para criação de produto (própria, independente da lista usada pelo calendário de marketing) e ideias de produto vinculadas a elas.
- Cada ideia tem título, descrição, categoria (reaproveitando as categorias já usadas no catálogo: miniatura colecionável, personalizado, utilitário, linha Leon), status (`ideia` → `em_desenvolvimento` → `lancada`, ou `descartada`), prioridade e responsável.
- **Nova role/sub-role "Ideação de Produtos"**, com um responsável (head) próprio, seguindo o mesmo padrão das 7 áreas de sócio já semeadas (Produção, Marketplace/Vendas, Site, Assinatura, Infra/Automação, Financeiro, Societário) — a criação da role em si já é suportada hoje pela tela de gestão de roles do Owner (`gestao-de-roles`), sem precisar de mudança de schema; o que muda aqui é o RBAC desta nova capability ser condicionado a essa role.
- Tela com lista/calendário das próximas datas comemorativas relevantes para produto e um board de ideias vinculadas a cada uma.

## Capabilities

### New Capabilities
- `organizador-ideacao-produtos`: lista de datas comemorativas voltada à criação de produto e board de ideias de produto vinculadas a elas, com ciclo de vida ideia/em_desenvolvimento/lancada/descartada.

### Modified Capabilities
(nenhuma — a criação da role "Ideação de Produtos" usa a capability `gestao-de-roles` já existente, que já suporta criar qualquer role nova via UI sem exigir requisito adicional.)

## Impact

- **Domínio de gestão afetado**: Produção (ideação de produto é etapa anterior à modelagem/produção, hoje responsabilidade informal do sócio de modelagem segundo camu-docs).
- **Dependência com camu-docs**: nenhuma para os requisitos funcionais — camu-docs não tem conteúdo sobre ideação de produtos, datas comemorativas ou nomes de sócios além de "Sócio A/B" genéricos; esta proposta é desenhada do zero. Reaproveita apenas o enum de categoria de produto já usado no catálogo.
- **Banco**: duas tabelas novas (`commemorative_dates_produtos`, `product_ideas`); nenhuma alteração em tabelas existentes.
- **UI**: nova rota para a área "Ideação de Produtos".
- **Seed**: a nova role/sub-role "Ideação de Produtos" e seu responsável (head) serão adicionados ao `seed-roles` como parte da proposta `seed-geral-sistema` (última a ser criada), não nesta.
