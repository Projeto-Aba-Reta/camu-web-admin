# estoque-de-insumos

## Purpose

Catálogo de insumos (filamento por tipo/cor, embalagem) usado na produção das peças, com custo de referência próprio por insumo — complementar aos parâmetros globais de precificação, permitindo variação de custo por cor/fornecedor sem exigir um novo parâmetro global a cada compra. Leitura ampla para Owner/Sócio e roles `producao`/`financeiro`; escrita restrita a Produção.

## Requirements

### Requirement: Cadastro de insumo com custo de referência
O sistema SHALL permitir cadastrar um insumo (filamento ou embalagem) com nome, tipo, unidade de medida e custo de referência próprio, independente dos parâmetros globais de precificação. Para insumos do tipo filamento, a unidade de medida SHALL ser obrigatoriamente `kg` ou `g`, e o custo de referência SHALL ser interpretado como custo por essa unidade — de modo que o custo por kg do filamento seja sempre resolvível e a baixa de estoque na produção seja calculada de forma consistente.

#### Scenario: Cadastro de filamento de cor especial
- **WHEN** um usuário autorizado cadastra um insumo "Filamento PLA vermelho" do tipo filamento com unidade `kg` e custo de referência diferente do parâmetro global de filamento
- **THEN** o sistema persiste o insumo com seu próprio custo de referência, sem alterar `cost_parameters`

#### Scenario: Filamento com unidade inválida é rejeitado
- **WHEN** um usuário tenta cadastrar ou editar um insumo do tipo filamento com uma unidade diferente de `kg` ou `g` (por exemplo, `rolo` ou `unidade`)
- **THEN** o sistema rejeita a operação, exigindo unidade `kg` ou `g`

#### Scenario: Embalagem mantém unidade livre
- **WHEN** um usuário cadastra um insumo do tipo embalagem com unidade `unidade`
- **THEN** o sistema aceita normalmente, pois a restrição de unidade vale apenas para filamento

### Requirement: Leitura ampla por Produção e Financeiro
O sistema SHALL permitir leitura do catálogo de insumos a usuários `owner`/`socio` ou com role `producao`/`financeiro`.

#### Scenario: Usuário de Financeiro consulta insumos
- **WHEN** um usuário com apenas a role `financeiro` consulta o catálogo de insumos
- **THEN** o sistema retorna a lista de insumos e seus custos de referência

### Requirement: Escrita restrita a Produção
O sistema SHALL permitir cadastrar e editar insumos apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Financeiro tenta cadastrar insumo
- **WHEN** um usuário com apenas a role `financeiro` tenta cadastrar um novo insumo
- **THEN** o sistema rejeita a escrita por Row Level Security

### Requirement: Custo por kg de filamento disponível para o motor de cálculo
O sistema SHALL expor, para cada insumo do tipo filamento, um custo por kg derivado do seu custo de referência e da sua unidade de medida (`kg` usado direto; `g` multiplicado por 1000), consumível pelo motor de cálculo de preço. Quando o custo de referência de um insumo de filamento for atualizado, o custo por kg derivado SHALL refletir o novo valor apenas em cálculos executados a partir de então.

#### Scenario: Custo por kg derivado de um filamento em kg
- **WHEN** o motor de cálculo solicita o custo por kg de um insumo de filamento cadastrado com unidade `kg` e custo de referência de R$ 80,00
- **THEN** o sistema retorna R$ 80,00 por kg, independente do parâmetro global de filamento

#### Scenario: Custo por kg derivado de um filamento em g
- **WHEN** o motor de cálculo solicita o custo por kg de um insumo de filamento cadastrado com unidade `g` e custo de referência de R$ 0,08 por grama
- **THEN** o sistema retorna R$ 80,00 por kg

#### Scenario: Atualização de custo de referência não altera cálculos salvos
- **WHEN** o custo de referência de um filamento é atualizado depois de já ter sido usado em um cálculo de preço salvo
- **THEN** o cálculo já salvo permanece inalterado e apenas cálculos novos passam a usar o custo por kg atualizado
