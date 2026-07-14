## Why

No domínio de **produção/catálogo**, a listagem de peças (`/producao/catalogo`) só oferece um caminho: clicar na linha e cair no formulário de detalhe/edição. Não há como **excluir** uma peça — nem pela listagem, nem pela tela de detalhe —, então rascunhos errados e peças criadas por engano ficam no catálogo para sempre, poluindo os filtros e distorcendo o indicador de maturidade por categoria (que é o gatilho de negócio para abrir a assinatura ao público). Também não há um ponto único onde o usuário enxergue as ações disponíveis para uma peça: "ver detalhes", "editar" e "excluir" simplesmente não existem como afordância na listagem.

## What Changes

- **Menu de ações por linha na listagem**: cada peça passa a expor um menu (`⋯`) com **Ver detalhes**, **Editar** e **Excluir**. Ver detalhes e Editar levam à tela de detalhe já existente (`/producao/catalogo/[productId]`), que continua sendo detalhe + edição em uma só tela; Excluir abre um diálogo de confirmação.
- **Exclusão de peça com guarda de integridade** (nova capacidade). Uma peça só pode ser removida de fato quando não tem histórico dependente. As FKs de `print_queue_items`, `product_stock_movements`, `material_stock_movements` e `product_components.component_product_id` referenciam `products` com `RESTRICT`: uma peça que já foi impressa, movimentou estoque ou é componente de uma peça composta **não pode** ser apagada sem destruir histórico contábil/produtivo.
  - Sem histórico → exclusão real. O cascade do banco limpa mídia, listagens de canal e ficha de fatiamento; os arquivos correspondentes no bucket `product-media` são removidos junto (o cascade do Postgres não alcança o Storage, e sem isso ficariam órfãos).
  - Com histórico → a exclusão é **bloqueada**, o diálogo explica quais vínculos impedem, e oferece a alternativa de marcar a peça como `descontinuado` (status que já existe no domínio).
- **Ações respeitam a permissão de escrita**: Excluir e Editar só aparecem para quem satisfaz `canWriteCatalog` (owner/sócio/produção). Quem tem acesso somente leitura (financeiro, marketplace-vendas) vê apenas **Ver detalhes**.
- A tela de detalhe ganha as mesmas ações de Excluir/Descontinuar no cabeçalho, para quem já está dentro da peça.

Sem mudanças de schema e sem **BREAKING** — a capacidade de edição já existia e permanece com o mesmo contrato.

## Capabilities

### New Capabilities
- `exclusao-de-peca`: regras de exclusão de uma peça do catálogo — quando a remoção é permitida, quais vínculos a bloqueiam, o que é removido em cascata (incluindo os arquivos de mídia no Storage) e a alternativa de descontinuar quando há histórico.

### Modified Capabilities
- `gestao-de-catalogo`: a listagem passa a expor ações por peça (ver detalhes, editar, excluir), com o conjunto de ações condicionado à permissão de escrita do usuário. As requirements de listagem/edição existentes não mudam de comportamento; entram requirements novas para a afordância de ações e para a alternativa de descontinuar.

## Impact

- **Domínio**: produção/catálogo. Toca indiretamente estoque e fila de impressão, mas apenas como **fonte das guardas de integridade** — nenhum registro desses domínios é alterado ou removido.
- **Código**:
  - `src/app/(dashboard)/producao/catalogo/actions.ts` — nova `deleteProductAction` e `discontinueProductAction`.
  - `src/lib/services/catalog-service.ts` — regra de exclusão (checagem de dependências + purga de Storage); `catalog-service.test.ts` cobre os casos de bloqueio.
  - `src/lib/repositories/` — leitura de contagens de dependência (fila de impressão, movimentações de estoque, uso como componente). `products.delete()` já existe.
  - `src/components/catalogo/product-list.tsx` — coluna de ações; novo `delete-product-dialog.tsx` (segue o padrão de `admin/delete-role-dialog.tsx`).
  - `src/app/(dashboard)/producao/catalogo/[productId]/page.tsx` — ações no cabeçalho.
- **Sem migração de banco**: as FKs `RESTRICT`/`CASCADE` existentes já expressam a política; a mudança apenas a torna explícita e legível na UI em vez de deixar o erro de FK vazar.
- **camu-docs**: sem dependência — nenhuma regra financeira ou de gatilho MEI/ME é afetada. A exclusão preserva por construção o histórico que alimenta o acompanhamento de faturamento.
