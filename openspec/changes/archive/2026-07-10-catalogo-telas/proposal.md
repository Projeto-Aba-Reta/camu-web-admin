## Why

`catalogo-schema` entrega o modelo de dados de peças, mídia e disponibilidade por canal, mas sem UI o catálogo autoral continuaria vivendo fora do painel. Este change entrega as telas que fecham a Fase de Produtos e Catálogo: cadastro e listagem de peças, upload de fotos e gestão de disponibilidade por canal — usando o cálculo de preço já existente (`precificacao-telas`) como ponto de partida ao precificar uma peça nova. É também o primeiro momento em que o painel se aproxima do critério de avanço de fase do `camu-docs` (catálogo autoral de 15-20 peças/categoria antes da assinatura recorrente) de forma mensurável dentro do próprio sistema.

## What Changes

- Cria a tela de **listagem do catálogo** em `(dashboard)/producao/catalogo`: tabela de peças com filtro por categoria de canal, porte e status, contagem de peças ativas por categoria (apoio visual ao critério de 15-20 peças/categoria do roadmap).
- Cria a tela de **cadastro/edição de peça** em `(dashboard)/producao/catalogo/[productId]` (e uma rota de criação): formulário de nome, descrição, categoria de canal, porte e status, com um passo para vincular um cálculo de preço existente (buscando em `precificacao/historico`) ou disparar um novo cálculo sem sair da tela.
- Cria o **gerenciador de fotos** da peça: upload para o storage já definido em `design.md`, reordenação por arrastar e definição de capa.
- Cria a tela de **disponibilidade por canal** dentro do detalhe da peça: ativar/desativar canais, definir preço praticado (pré-preenchido com o preço sugerido do cálculo vinculado) e registrar o motivo quando o preço divergir.
- Registra a rota de área para o slug `producao` no registro de rotas de área consumido por `navegacao-por-area`.
- Restringe cadastro/edição de peça e mídia a Owner/Sócio/role `producao`; leitura liberada a `producao`/`financeiro`/`marketplace-vendas`; disponibilidade por canal editável também por `marketplace-vendas`.

## Capabilities

### New Capabilities
- `gestao-de-catalogo`: telas de listagem, cadastro e edição de peças do catálogo autoral, incluindo vínculo com cálculo de preço.
- `gestao-de-midia-de-peca`: upload, reordenação e definição de capa das fotos de uma peça.
- `gestao-de-disponibilidade-por-canal`: telas de ativação/desativação de canal por peça e definição de preço praticado com registro de divergência.

### Modified Capabilities
(nenhuma — `navegacao-por-area` não muda de requisito; este change só adiciona uma entrada de rota real para o slug `producao`, já previsto por essa capability)

## Impact

- **Depende de**: `catalogo-schema` (schema, repositórios, `catalog-service`), `precificacao-telas`/`precificacao-schema-motor-calculo` (cálculo de preço reaproveitado ao vincular peça), `fundacao-sidebar-e-shell` (shell/design system), `fundacao-admin-roles-usuarios` (roles reais `producao`/`financeiro`/`marketplace-vendas`).
- **Novo**: `src/app/(dashboard)/producao/catalogo/{page.tsx,novo/page.tsx,[productId]/page.tsx}`, `src/components/catalogo/{product-form,product-list,media-manager,channel-listing-form}.tsx`.
- **Novo (infra)**: bucket de storage para fotos de peça (Supabase Storage), com policy de acesso equivalente à de escrita de `product_media`.
- **Domínio de gestão**: Produção/Catálogo, com pontos de contato em Financeiro (leitura) e Vendas/Marketplace (disponibilidade por canal).
- **Dependência de `camu-docs`**: direta — categorias exibidas seguem `06-marketplace/estrategia-canais.md`; o indicador de contagem por categoria na listagem apoia o critério de avanço de fase citado em `02-roadmap/fase-4-assinatura-recorrente.md` (15-20 peças/categoria).
- Fecha a fase de Produtos e Catálogo do roadmap do painel — a partir daqui, `estoque-schema` pode referenciar `products` para rastrear quantidade produzida/disponível.
