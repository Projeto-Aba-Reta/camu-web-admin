## MODIFIED Requirements

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
