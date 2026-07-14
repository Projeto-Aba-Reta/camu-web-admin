# gestao-de-catalogo

## Purpose

Telas de gestão do catálogo de peças: listagem filtrável com indicador de maturidade por categoria, tela de detalhe da peça, cadastro e edição de peças com vínculo a cálculo de preço (existente ou recém-executado), ações por peça (ver detalhes, editar, excluir) e controle de acesso por role.

## Requirements

### Requirement: Listagem do catálogo com filtros
O sistema SHALL exibir uma listagem de peças filtrável por categoria de canal, porte e status.

#### Scenario: Filtro por categoria
- **WHEN** um usuário filtra a listagem pela categoria `linha_leon`
- **THEN** a tela exibe apenas as peças cadastradas com essa categoria

### Requirement: Indicador de maturidade do catálogo por categoria
A listagem SHALL exibir, para cada categoria, a contagem de peças com status `ativo` em relação à referência de maturidade do catálogo.

#### Scenario: Categoria com 12 de 20 peças ativas
- **WHEN** a categoria `utilitario` tem 12 peças com status `ativo`
- **THEN** a listagem exibe o indicador dessa categoria como 12 em relação à referência de maturidade

### Requirement: Cadastro de peça com precificação vinculável
O sistema SHALL permitir cadastrar uma peça e, na mesma tela, buscar um cálculo de preço já existente para vincular ou executar um novo cálculo sem sair da tela de cadastro.

#### Scenario: Cadastro vinculando cálculo existente
- **WHEN** um usuário busca e seleciona um cálculo de preço já executado ao cadastrar uma peça
- **THEN** o sistema associa a peça a esse cálculo, sem criar um novo registro em `price_calculations`

#### Scenario: Cadastro executando novo cálculo
- **WHEN** um usuário informa peso, tempo e impressora diretamente no formulário de cadastro de peça
- **THEN** o sistema executa o cálculo, salva o novo registro de `price_calculations` e vincula automaticamente à peça sendo criada

### Requirement: Edição de peça existente
O sistema SHALL permitir editar nome, descrição, categoria, porte e status de uma peça já cadastrada, incluindo trocar o cálculo de preço vinculado.

#### Scenario: Troca de cálculo de preço vinculado
- **WHEN** um usuário seleciona um cálculo de preço diferente para uma peça já cadastrada
- **THEN** o sistema atualiza o vínculo da peça, sem alterar o registro do cálculo anterior

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

### Requirement: Acesso conforme regra de domínio do catálogo
O sistema SHALL restringir a criação, edição e exclusão de peças a usuários `owner`/`socio` ou com a role `producao`, permitindo leitura da listagem e do detalhe a `producao`, `financeiro` e `marketplace-vendas`.

#### Scenario: Usuário de Financeiro acessa a listagem
- **WHEN** um usuário com apenas a role `financeiro` acessa a listagem do catálogo
- **THEN** o sistema exibe a listagem em modo somente leitura, sem ações de criação, edição ou exclusão disponíveis
