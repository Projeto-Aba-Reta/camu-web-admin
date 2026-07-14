## ADDED Requirements

### Requirement: Ações por peça na listagem
A listagem do catálogo SHALL expor, para cada peça, um menu de ações com **Ver detalhes**, **Editar** e **Excluir**. Ver detalhes e Editar levam à tela de detalhe da peça (`/producao/catalogo/[productId]`), que concentra visualização e edição. Excluir SHALL abrir um diálogo de confirmação antes de qualquer remoção.

#### Scenario: Usuário abre o menu de ações de uma peça
- **WHEN** um usuário com permissão de escrita abre o menu de ações de uma peça na listagem
- **THEN** a tela exibe as opções Ver detalhes, Editar e Excluir

#### Scenario: Exclusão exige confirmação
- **WHEN** um usuário aciona Excluir no menu de ações de uma peça
- **THEN** o sistema abre um diálogo de confirmação e não remove nada até a confirmação explícita

### Requirement: Ações de exclusão e descontinuação na tela de detalhe
A tela de detalhe de uma peça SHALL oferecer, para usuários com permissão de escrita, as mesmas ações de excluir e descontinuar disponíveis na listagem.

#### Scenario: Exclusão bem-sucedida a partir do detalhe
- **WHEN** um usuário exclui, a partir da tela de detalhe, uma peça sem histórico dependente
- **THEN** o sistema remove a peça e redireciona o usuário para a listagem do catálogo

### Requirement: Conjunto de ações condicionado à permissão
O sistema SHALL exibir apenas as ações permitidas ao usuário: Editar e Excluir SHALL aparecer somente para usuários com permissão de escrita no catálogo (`owner`/`socio` ou role `producao`); os demais usuários com acesso de leitura SHALL ver apenas Ver detalhes.

#### Scenario: Usuário de Financeiro abre o menu de ações
- **WHEN** um usuário com apenas a role `financeiro` abre o menu de ações de uma peça na listagem
- **THEN** a tela exibe somente a opção Ver detalhes, sem Editar nem Excluir

## MODIFIED Requirements

### Requirement: Acesso conforme regra de domínio do catálogo
O sistema SHALL restringir a criação, edição e exclusão de peças a usuários `owner`/`socio` ou com a role `producao`, permitindo leitura da listagem e do detalhe a `producao`, `financeiro` e `marketplace-vendas`.

#### Scenario: Usuário de Financeiro acessa a listagem
- **WHEN** um usuário com apenas a role `financeiro` acessa a listagem do catálogo
- **THEN** o sistema exibe a listagem em modo somente leitura, sem ações de criação, edição ou exclusão disponíveis
