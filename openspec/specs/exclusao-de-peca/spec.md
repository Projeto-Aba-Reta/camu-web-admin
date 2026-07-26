# exclusao-de-peca

## Purpose

Regras de exclusão permanente de peças do catálogo: quais vínculos caracterizam histórico produtivo ou contábil e impedem a remoção, o que é removido em cascata (incluindo arquivos no Storage), a descontinuação como alternativa quando a exclusão é bloqueada, e a permissão exigida para excluir ou descontinuar.

## Requirements

### Requirement: Exclusão de peça sem histórico dependente
O sistema SHALL permitir excluir permanentemente uma peça do catálogo quando ela não tiver nenhum registro dependente que represente histórico produtivo ou contábil.

São considerados histórico dependente, e portanto impeditivos de exclusão:
- itens da fila de impressão que referenciam a peça (`print_queue_items`);
- movimentações de estoque de peças prontas (`product_stock_movements`);
- movimentações de estoque de insumos atribuídas à peça (`material_stock_movements`);
- uso da peça como componente de uma peça composta (`product_components.component_product_id`).

Não são impeditivos, e SHALL ser removidos junto com a peça: mídia (`product_media`), listagens por canal (`product_channel_listings`), fichas de fatiamento (`product_slicing_sheets`) e a composição da própria peça quando ela é composta (`product_components.parent_product_id`).

#### Scenario: Exclusão de rascunho recém-criado
- **WHEN** um usuário com permissão de escrita no catálogo exclui uma peça que nunca entrou na fila de impressão, não movimentou estoque e não é componente de nenhuma peça composta
- **THEN** o sistema remove permanentemente a peça e, em cascata, sua mídia, listagens por canal e fichas de fatiamento

#### Scenario: Cálculo de preço vinculado não impede exclusão
- **WHEN** um usuário exclui uma peça que tem um cálculo de preço vinculado, mas nenhum histórico de produção ou estoque
- **THEN** o sistema remove a peça e preserva o registro em `price_calculations`, apenas desfazendo o vínculo com a peça

### Requirement: Bloqueio de exclusão de peça com histórico
O sistema SHALL recusar a exclusão de uma peça que tenha histórico dependente, SHALL informar quais vínculos impedem a remoção e SHALL preservar integralmente os registros dependentes.

#### Scenario: Peça já impressa
- **WHEN** um usuário tenta excluir uma peça que possui itens na fila de impressão
- **THEN** o sistema recusa a exclusão, informa que a peça possui histórico de produção e nenhum registro é removido

#### Scenario: Peça usada como componente de peça composta
- **WHEN** um usuário tenta excluir uma peça que é componente de uma peça composta
- **THEN** o sistema recusa a exclusão e informa que a peça é componente de outra(s) peça(s)

#### Scenario: Peça com movimentação de estoque
- **WHEN** um usuário tenta excluir uma peça que possui movimentações de estoque de peças prontas
- **THEN** o sistema recusa a exclusão e informa que a peça possui histórico de estoque

### Requirement: Descontinuar como alternativa à exclusão
Quando a exclusão for bloqueada por histórico dependente, o sistema SHALL oferecer a alternativa de marcar a peça como `descontinuado`, mantendo todos os registros dependentes intactos.

#### Scenario: Usuário descontinua peça que não pode ser excluída
- **WHEN** um usuário confirma a alternativa de descontinuar uma peça cuja exclusão foi bloqueada
- **THEN** o sistema altera o status da peça para `descontinuado` e mantém intactos os itens de fila, movimentações de estoque e vínculos de composição

### Requirement: Remoção dos arquivos de mídia no Storage
Ao excluir permanentemente uma peça, o sistema SHALL remover do bucket `product-media` os arquivos correspondentes às mídias da peça, além dos registros em banco.

#### Scenario: Peça com fotos é excluída
- **WHEN** um usuário exclui uma peça que possui fotos cadastradas
- **THEN** o sistema remove os objetos correspondentes do bucket `product-media`, sem deixar arquivos órfãos no Storage

#### Scenario: Falha ao remover arquivos do Storage
- **WHEN** a remoção dos arquivos no Storage falha durante a exclusão de uma peça
- **THEN** o sistema não remove a peça do banco e informa o erro ao usuário

### Requirement: Exclusão restrita a quem tem escrita no catálogo
O sistema SHALL restringir a exclusão e a descontinuação de peças a usuários `owner`/`socio` ou com a role `producao`, validando a permissão na própria Server Action.

#### Scenario: Usuário somente leitura tenta excluir
- **WHEN** um usuário com apenas a role `precificacao` invoca a exclusão de uma peça
- **THEN** o sistema recusa a operação por falta de permissão e nenhuma peça é removida
