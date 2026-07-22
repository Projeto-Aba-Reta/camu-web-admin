## ADDED Requirements

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
