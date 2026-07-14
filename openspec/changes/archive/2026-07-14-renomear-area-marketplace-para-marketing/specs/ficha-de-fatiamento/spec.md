## MODIFIED Requirements

### Requirement: Acesso à ficha de fatiamento
O sistema SHALL permitir leitura da ficha de fatiamento a usuários `owner`/`socio` ou com role `producao`, `financeiro` ou `marketing`, e escrita (cadastrar, reeditar) apenas a usuários `owner`/`socio` ou com role `producao` — mesma regra de acesso já usada no cadastro do catálogo.

#### Scenario: Usuário de Marketing consulta a ficha de fatiamento
- **WHEN** um usuário com apenas a role `marketing` consulta a ficha de fatiamento de uma peça
- **THEN** o sistema exibe os dados normalmente

#### Scenario: Usuário de Marketing tenta cadastrar uma ficha de fatiamento
- **WHEN** um usuário com apenas a role `marketing` tenta cadastrar ou editar uma ficha de fatiamento
- **THEN** o sistema rejeita a escrita por Row Level Security
