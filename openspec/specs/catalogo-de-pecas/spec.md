# catalogo-de-pecas

## Purpose

Cadastro de peças do catálogo autoral do ateliê: nome, descrição, categoria de canal, porte e status de ciclo de vida, com vínculo opcional a um cálculo de preço (`price_calculations`) e controle de acesso por role (leitura ampla, escrita restrita a Produção).

## Requirements

### Requirement: Cadastro de peça com categoria de canal e porte independentes
O sistema SHALL permitir cadastrar uma peça do catálogo com nome, descrição, categoria de canal (`miniatura_colecionavel`, `personalizado`, `utilitario`, `linha_leon`) e porte — qualquer porte cadastrado, fixo (`P`, `M`, `G`) ou personalizado —, armazenados como atributos independentes entre si. O catálogo SHALL exibir o nome de exibição do porte da peça, não apenas o seu código.

#### Scenario: Cadastro de uma peça da linha Leon de porte P
- **WHEN** um usuário autorizado cadastra uma peça com categoria `linha_leon` e porte `P`
- **THEN** o sistema persiste a peça com os dois atributos, sem exigir relação entre o valor de um e o do outro

#### Scenario: Cadastro de peça com porte personalizado
- **WHEN** existe um porte personalizado `GG` e um usuário cadastra uma peça com esse porte
- **THEN** o sistema persiste a peça com o porte `GG` e o catálogo exibe o nome de exibição desse porte

#### Scenario: Peça com porte não cadastrado
- **WHEN** um usuário tenta cadastrar ou atualizar uma peça com um código de porte que não corresponde a nenhum porte cadastrado
- **THEN** o sistema rejeita a escrita, pois o porte precisa ser um porte existente

### Requirement: Status de ciclo de vida da peça
Toda peça SHALL ter um status dentre `rascunho`, `ativo`, `inativo` ou `descontinuado`, com `rascunho` como padrão na criação.

#### Scenario: Nova peça criada sem status informado
- **WHEN** uma peça é criada sem status explícito
- **THEN** o sistema define o status como `rascunho`

### Requirement: Tipo de peça simples ou composta
Toda peça SHALL ter um tipo dentre `simples` ou `composta`, com `simples` como padrão na criação; uma peça `composta` é aquela formada por outras peças do catálogo cadastradas como seus componentes.

#### Scenario: Nova peça criada sem tipo informado
- **WHEN** uma peça é criada sem tipo explícito
- **THEN** o sistema define o tipo como `simples`

#### Scenario: Cadastro de peça composta
- **WHEN** um usuário autorizado cadastra uma peça com tipo `composta`
- **THEN** o sistema permite associar componentes a essa peça, conforme a capacidade de composição de produto

### Requirement: Vínculo opcional com cálculo de preço
Uma peça SHALL poder ser vinculada a um registro existente de `price_calculations`, e SHALL poder existir sem esse vínculo (peça ainda não precificada).

#### Scenario: Peça criada antes de qualquer cálculo de preço
- **WHEN** uma peça é cadastrada sem um cálculo de preço vinculado
- **THEN** o sistema aceita a criação normalmente, mantendo `price_calculation_id` nulo

#### Scenario: Vínculo de peça a um cálculo existente
- **WHEN** uma peça é vinculada a um `price_calculations` existente
- **THEN** o sistema associa o vínculo sem alterar o registro de cálculo original

### Requirement: Slug amigável para URL da loja
Toda peça SHALL ter um `slug` único e estável, usado como identificador na URL da loja do site. O slug SHALL ser gerado automaticamente a partir do nome no cadastro (apenas `[a-z0-9-]`, desambiguado por sufixo em caso de colisão) e SHALL poder ser editado depois, mantendo a unicidade.

#### Scenario: Slug gerado no cadastro
- **WHEN** uma peça é cadastrada com o nome "Miniatura RPG — Guerreiro Anão" sem slug informado
- **THEN** o sistema gera um slug único a partir do nome (ex.: `miniatura-rpg-guerreiro-anao`)

#### Scenario: Colisão de slug
- **WHEN** já existe uma peça com slug `guerreiro` e outra peça geraria o mesmo slug
- **THEN** o sistema desambigua o novo slug (ex.: `guerreiro-2`), preservando a unicidade

#### Scenario: Edição de slug para valor já usado
- **WHEN** um usuário tenta editar o slug de uma peça para um valor já usado por outra peça
- **THEN** o sistema rejeita a alteração por violar a unicidade do slug

### Requirement: Prazo de produção estimado da peça
Uma peça SHALL poder registrar um prazo de produção estimado como faixa de dias (mínimo e máximo), ambos opcionais, exibível na loja como estimativa de "feito sob encomenda".

#### Scenario: Peça com faixa de prazo informada
- **WHEN** um usuário informa prazo de produção de 5 a 7 dias em uma peça
- **THEN** o sistema persiste o mínimo e o máximo, disponíveis para a loja exibir a estimativa

#### Scenario: Peça sem prazo informado
- **WHEN** uma peça é cadastrada sem prazo de produção
- **THEN** o sistema aceita normalmente, e a loja exibe apenas "feito sob encomenda" sem faixa de dias

### Requirement: Peça pronta para publicação na loja própria
O sistema SHALL considerar uma peça apta a ser publicada na loja própria somente quando ela tiver status `ativo`, um `slug`, uma foto de capa e uma listagem `loja_propria` com preço. Enquanto qualquer um desses itens faltar, o sistema SHALL impedir a ativação da publicação na loja própria, indicando o que falta.

#### Scenario: Tentativa de publicar peça sem capa
- **WHEN** um usuário tenta publicar na loja própria uma peça `ativo` com slug e preço, mas sem foto de capa
- **THEN** o sistema recusa a publicação e indica que falta a foto de capa

#### Scenario: Peça com todos os requisitos é publicável
- **WHEN** uma peça `ativo` tem slug, foto de capa e preço `loja_propria`
- **THEN** o sistema permite ativar a publicação na loja própria

### Requirement: Leitura ampla por Produção, Financeiro e Marketing
O sistema SHALL permitir leitura do catálogo a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`.

#### Scenario: Usuário de Marketing consulta o catálogo
- **WHEN** um usuário com apenas a role `marketing` consulta a lista de peças
- **THEN** o sistema retorna as peças, pois a leitura é liberada para essa role

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir criar, editar e remover peças apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Marketing tenta cadastrar peça
- **WHEN** um usuário com apenas a role `marketing` tenta cadastrar uma nova peça
- **THEN** o sistema rejeita a escrita por Row Level Security

