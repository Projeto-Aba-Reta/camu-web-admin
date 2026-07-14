## Context

A tela de catálogo (`/producao/catalogo`) lista peças e leva ao detalhe (`/producao/catalogo/[productId]`), que já é detalhe + edição em uma só tela (`ProductForm` com `fieldset disabled={!canWrite}`). Editar já funciona via `updateProductAction`. O que não existe é **excluir**: não há `deleteProductAction`, nem afordância de ações na listagem — a única interação com a linha é navegar.

A restrição que domina o desenho é o grafo de FKs sobre `products`:

| Tabela | Coluna | `ON DELETE` | Efeito na exclusão |
| --- | --- | --- | --- |
| `product_media` | `product_id` | `cascade` | removida junto |
| `product_channel_listings` | `product_id` | `cascade` | removida junto |
| `product_slicing_sheets` | `product_id` | `cascade` | removida junto |
| `product_components` | `parent_product_id` | `cascade` | removida junto |
| `price_calculations` | `product_id` | `set null` | preservado, só desvincula |
| `product_components` | `component_product_id` | `restrict` | **bloqueia** |
| `print_queue_items` | `product_id` | (sem cláusula → `no action`) | **bloqueia** |
| `product_stock_movements` | `product_id` | (sem cláusula → `no action`) | **bloqueia** |
| `material_stock_movements` | `product_id` | (sem cláusula → `no action`) | **bloqueia** |

Ou seja: o banco **já** tem uma política de exclusão embutida, e ela é a política correta de negócio (histórico produtivo e contábil é imutável). Hoje ela só não é legível — se alguém chamasse `products.delete()`, o usuário receberia um erro de constraint em cru. `IProductRepository.delete()` já existe e nunca é chamado.

`product-media` no Supabase Storage é o ponto cego: o `cascade` do Postgres apaga as linhas de `product_media`, mas **não** os objetos no bucket. Excluir uma peça sem tratar isso vaza arquivos órfãos.

## Goals / Non-Goals

**Goals:**
- Expor ver detalhes / editar / excluir como ações explícitas por peça, na listagem e no detalhe.
- Tornar a política de exclusão do banco visível e explicável na UI: bloquear com motivo em vez de deixar o erro de FK vazar.
- Oferecer `descontinuado` como saída para a peça que não pode ser removida.
- Não deixar arquivo órfão no bucket `product-media`.

**Non-Goals:**
- Não introduzir soft delete (coluna `deleted_at`). O domínio já tem o status `descontinuado`, que cobre "some do catálogo ativo mas preserva histórico"; uma segunda dimensão de "apagado" só duplicaria estado.
- Não mudar schema nem FK. As constraints atuais já expressam a política.
- Não criar uma tela de detalhe read-only separada da de edição. A tela atual já serve os dois papéis e o `fieldset disabled` já protege o leitor.
- Não tocar em fila de impressão, estoque ou precificação — eles são lidos como fonte das guardas, nunca escritos.

## Decisions

### 1. Exclusão guardada em vez de soft delete universal ou cascade forçado

`CatalogService.deleteProduct()` consulta as dependências **antes** de excluir. Se houver qualquer uma das quatro impeditivas, retorna um erro tipado com a lista de vínculos; não chama `products.delete()`.

Alternativas descartadas:
- **Soft delete sempre** (`deleted_at`): uniforme e simples, mas deixa todo rascunho errado no banco para sempre e cria uma segunda dimensão de estado ao lado de `status`, com o custo de filtrar `deleted_at is null` em todo lugar que lê `products`. O ganho real (poder desfazer) já é dado por `descontinuado`.
- **Cascade forçado** (apagar fila e movimentações junto): destrói histórico de produção e de estoque que alimenta o fechamento mensal e o acompanhamento de faturamento x teto. Inaceitável para um painel que é a fonte de verdade contábil da sociedade.

Confiar apenas no erro de FK do Postgres também foi descartado: a mensagem cita nome de constraint, não diz *quais* peças compostas usam esta como componente, e não distingue "está na fila" de "movimentou estoque".

### 2. A checagem é uma consulta de contagem, não um carregamento de linhas

`CatalogService.getProductDependencies(productId)` devolve `{ printQueueItems, productStockMovements, materialStockMovements, usedAsComponentIn }` — contagens, não coleções. Isso exige métodos novos nos repositórios, já que hoje eles só têm `findBy*`:

- `IPrintQueueRepository.countByProductId(productId)`
- `IProductStockMovementRepository.countByProductId(productId)`
- `IMaterialStockMovementRepository.countByProductId(productId)`
- `IProductComponentRepository.findByComponentProductId(productId)` — aqui a lista importa: o diálogo mostra *quais* peças compostas usam esta, o que é acionável ("remova o componente de X primeiro"); um número seco não seria.

As quatro contagens rodam em paralelo (`Promise.all`).

### 3. Storage antes do banco

A ordem em `deleteProduct()` é: checar dependências → remover objetos do bucket → `products.delete()`.

Storage primeiro porque a falha é recuperável na direção certa: se o `remove` do bucket falhar, abortamos e a peça continua íntegra (o pior caso é um objeto já removido cujo registro ainda existe — a mídia aparece quebrada, e o usuário pode reexcluir). Na ordem inversa, um `delete` bem-sucedido seguido de falha no Storage deixaria arquivos órfãos **sem nenhum registro que os aponte** — lixo permanente e invisível, impossível de reconciliar. Não há transação distribuída entre Postgres e Storage; escolhemos o modo de falha que deixa rastro.

### 4. Um único diálogo que decide o que oferecer, com as guardas carregadas sob demanda

`DeleteProductDialog` decide o que renderizar a partir de uma checagem única (`CatalogService.getDeletionCheck`), que devolve tudo já em forma renderizável — `{ canDelete, blockers, cascade }`:

- pode excluir → confirmação de exclusão permanente, com o aviso do que vai junto (N fotos, N canais, N fichas);
- não pode → **não** oferece excluir. Lista os vínculos (`blockers`, com as peças compostas nomeadas) e oferece o botão "Descontinuar peça" (`discontinueProductAction`), a menos que a peça já esteja `descontinuado`, caso em que só informa.

A checagem roda **ao abrir o diálogo**, via `getProductDeletionCheckAction`, e não na renderização da listagem. Calculá-la para todas as peças custaria 4 consultas por peça — numa listagem de 100 peças, centenas de round-trips ao PostgREST para uma informação que só é usada se o usuário clicar em "Excluir". Sob demanda, é uma chamada para uma peça, no momento em que a resposta importa. O preço é um estado de carregamento ("Verificando os vínculos desta peça…") no diálogo, que é barato e honesto.

Isso segue o padrão de `admin/delete-role-dialog.tsx` (AlertDialog + `useTransition` + `toast` + `router.refresh()`), com duas diferenças: lá o impacto é um aviso e aqui pode ser um bloqueio, e lá o diálogo traz seu próprio `AlertDialogTrigger`. Aqui não pode: na listagem o gatilho é um item de `DropdownMenu`, e um `AlertDialogTrigger` aninhado no menu é desmontado junto com o menu ao fechar. O diálogo é então **controlado** — quem chama o monta só quando há peça selecionada (com `key={product.id}`), de modo que o estado da checagem nasce limpo a cada abertura.

### 5. Ações na coluna, permissão decide o menu

`ProductList` ganha uma coluna de ações com `DropdownMenu` (o componente já existe em `components/ui`). O menu recebe `canWrite` e monta o conjunto: sem escrita, só **Ver detalhes**. O `onClick` da linha continua navegando para o detalhe; o menu tem `stopPropagation` para não disparar a navegação junto — o mesmo cuidado que o `Link` do nome da peça já toma hoje.

`deleteProductAction` e `discontinueProductAction` chamam `requireCatalogWrite()`, como todas as outras actions do arquivo: Server Actions são endpoints independentes e o guard do layout não as protege.

## Risks / Trade-offs

- **Janela entre a checagem e o `delete`** — uma peça pode entrar na fila de impressão entre o cálculo das dependências e a confirmação da exclusão → o FK `RESTRICT` continua sendo a rede de segurança real: o `delete` falha, a action captura e devolve a mensagem. A checagem prévia é para *explicar*, não para *garantir*; a garantia é do banco.
- **Objeto removido do Storage com peça preservada** (falha parcial, Decisão 3) → aceito conscientemente como o lado bom do trade-off: fica visível na UI (mídia quebrada) e é reconciliável reexcluindo.
- **Exclusão permanente sem desfazer** → mitigado por ser possível apenas para peças sem nenhum histórico (nada de valor a perder), pela confirmação explícita, e pela listagem do que será removido em cascata.

## Migration Plan

Sem migração de banco. Deploy é uma release de aplicação normal; rollback é reverter o commit (nenhum dado é transformado). A remoção de arquivos do Storage é a única ação irreversível, e só ocorre em exclusões que o usuário confirmou.

## Open Questions

Nenhuma bloqueante.
