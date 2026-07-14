# composicao-de-produto

## Purpose

Composição de peças compostas do catálogo: vínculo de peças componentes com quantidade, validação de pré-requisitos de custo, prevenção de ciclos e cálculo do custo agregado, com leitura ampla e escrita restrita a Produção.

## Requirements

### Requirement: Peça composta referenciando componentes com quantidade
O sistema SHALL permitir que uma peça do catálogo do tipo `composta` referencie uma ou mais peças componentes já cadastradas no catálogo, cada vínculo com uma quantidade inteira maior que zero.

#### Scenario: Cadastro da composição da Caixa Mandala
- **WHEN** um usuário autorizado cadastra a peça "Caixa Mandala" como `composta`, referenciando "Decágono central" (quantidade 1), "Cunha" (quantidade 10) e "Trava" (quantidade 10)
- **THEN** o sistema persiste os três vínculos de componente com suas respectivas quantidades

#### Scenario: Tentativa de quantidade inválida
- **WHEN** um usuário tenta cadastrar um componente com quantidade zero ou negativa
- **THEN** o sistema rejeita a operação

### Requirement: Componente exige custo conhecido antes de ser adicionado
O sistema SHALL exigir que uma peça componente já tenha uma ficha de fatiamento cadastrada ou um `price_calculations` vinculado antes de poder ser adicionada como componente de uma peça composta.

#### Scenario: Tentativa de adicionar componente sem custo conhecido
- **WHEN** um usuário tenta adicionar como componente uma peça que não tem ficha de fatiamento nem cálculo de preço salvo
- **THEN** o sistema rejeita a inclusão e exibe orientação para cadastrar a ficha de fatiamento ou calcular o preço da peça componente primeiro

### Requirement: Composição sem ciclos
O sistema SHALL rejeitar a criação de um vínculo de componente que resulte em uma peça composta contendo, direta ou transitivamente, a si mesma como componente.

#### Scenario: Tentativa de ciclo direto
- **WHEN** um usuário tenta adicionar a peça "Caixa Mandala" como componente dela mesma
- **THEN** o sistema rejeita a operação

#### Scenario: Tentativa de ciclo transitivo
- **WHEN** a peça A contém a peça B como componente, e um usuário tenta adicionar a peça A como componente da peça B
- **THEN** o sistema rejeita a operação por formar um ciclo

### Requirement: Custo agregado de peça composta
O sistema SHALL calcular o custo de uma peça composta como a soma, para cada componente, do custo do cálculo mais recente daquele componente multiplicado pela sua quantidade na composição.

#### Scenario: Custo do sistema completo da Caixa Mandala
- **WHEN** o sistema calcula o custo da peça composta "Caixa Mandala" (1 decágono central + 10 cunhas + 10 travas)
- **THEN** o custo total retornado é a soma do custo do decágono, mais 10 vezes o custo de uma cunha, mais 10 vezes o custo de uma trava

#### Scenario: Componente sem cálculo salvo mas com ficha de fatiamento
- **WHEN** um componente tem ficha de fatiamento cadastrada mas nunca teve um cálculo de preço executado, e a peça composta que o contém é calculada
- **THEN** o sistema calcula e salva um novo cálculo de preço para esse componente antes de agregá-lo ao custo da peça composta

### Requirement: Leitura ampla por Produção, Financeiro e Marketing; escrita restrita a Produção
O sistema SHALL permitir leitura da composição de uma peça a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`, e permitir criar, editar ou remover vínculos de componente apenas a usuários `owner`/`socio` ou com a role `producao` — mesma regra de acesso já usada no cadastro do catálogo.

#### Scenario: Usuário de Marketing consulta a composição de uma peça
- **WHEN** um usuário com apenas a role `marketing` consulta os componentes de uma peça composta
- **THEN** o sistema exibe a lista de componentes e quantidades normalmente

#### Scenario: Usuário de Marketing tenta editar a composição
- **WHEN** um usuário com apenas a role `marketing` tenta adicionar ou remover um componente
- **THEN** o sistema rejeita a escrita por Row Level Security

