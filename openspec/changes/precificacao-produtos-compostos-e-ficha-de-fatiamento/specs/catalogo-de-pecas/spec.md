## ADDED Requirements

### Requirement: Tipo de peça simples ou composta
Toda peça SHALL ter um tipo dentre `simples` ou `composta`, com `simples` como padrão na criação; uma peça `composta` é aquela formada por outras peças do catálogo cadastradas como seus componentes.

#### Scenario: Nova peça criada sem tipo informado
- **WHEN** uma peça é criada sem tipo explícito
- **THEN** o sistema define o tipo como `simples`

#### Scenario: Cadastro de peça composta
- **WHEN** um usuário autorizado cadastra uma peça com tipo `composta`
- **THEN** o sistema permite associar componentes a essa peça, conforme a capacidade de composição de produto
