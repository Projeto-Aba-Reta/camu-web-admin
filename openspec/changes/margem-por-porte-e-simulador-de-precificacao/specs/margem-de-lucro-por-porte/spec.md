## ADDED Requirements

### Requirement: Margem de lucro própria por faixa de porte
O sistema SHALL armazenar, em cada faixa de porte (P/M/G), uma margem de lucro B2C com seu modo de aplicação e uma margem de lucro B2B com seu modo de aplicação, versionadas por `valid_from` junto com a própria faixa, sem sobrescrever registros existentes.

#### Scenario: Financeiro define a margem do porte G
- **WHEN** um usuário autorizado registra, para a faixa G, margem B2C de 20% no modo `somar` e margem B2B de 10% no modo `substituir`
- **THEN** o sistema cria um novo registro da faixa G com `valid_from = now()`, preservando o registro anterior sem alteração, e as novas margens passam a valer para os cálculos seguintes

#### Scenario: Faixa de porte sem margem configurada
- **WHEN** uma faixa de porte foi cadastrada sem margem de lucro
- **THEN** o sistema considera a margem dessa faixa como 0% no modo `somar`, para B2C e para B2B

### Requirement: Modo de aplicação somar ou substituir
O sistema SHALL resolver a margem efetiva de uma peça a partir do modo configurado na faixa de porte: no modo `somar`, a margem efetiva é a soma da margem-alvo base com a margem da faixa de porte; no modo `substituir`, a margem efetiva é a margem da faixa de porte, e a margem-alvo base é ignorada.

#### Scenario: Modo somar sobre a margem-alvo B2C
- **WHEN** a margem-alvo B2C vigente é 15% e a faixa de porte da peça tem margem B2C de 20% no modo `somar`
- **THEN** a margem efetiva B2C da peça é 35%

#### Scenario: Modo substituir sobre a margem-alvo B2C
- **WHEN** a margem-alvo B2C vigente é 15% e a faixa de porte da peça tem margem B2C de 20% no modo `substituir`
- **THEN** a margem efetiva B2C da peça é 20%, e os 15% da margem-alvo global não entram na conta

#### Scenario: Margem da faixa de porte igual a zero no modo somar
- **WHEN** a faixa de porte da peça tem margem 0% no modo `somar`
- **THEN** a margem efetiva é exatamente a margem-alvo base, preservando o preço calculado antes da existência da margem por porte

### Requirement: Margem B2C e margem B2B configuradas independentemente
O sistema SHALL tratar a margem B2C e a margem B2B de uma faixa de porte como parâmetros independentes, cada um com seu próprio percentual e seu próprio modo, de forma que uma mesma faixa possa somar no B2C e substituir no B2B.

#### Scenario: Porte G soma no B2C e substitui no B2B
- **WHEN** a faixa G tem margem B2C de 20% no modo `somar` e margem B2B de 10% no modo `substituir`, a margem-alvo B2C vigente é 15% e a faixa de volume B2B de 10 unidades tem margem-alvo de 8%
- **THEN** a margem efetiva B2C da peça G é 35% e a margem efetiva B2B dessa peça na faixa de 10 unidades é 10%

#### Scenario: Base B2B é a margem da faixa de volume, não a margem-alvo B2C
- **WHEN** o sistema resolve a margem efetiva B2B de uma peça para uma faixa de volume
- **THEN** o sistema usa como base a margem-alvo daquela faixa de volume, nunca a margem-alvo B2C

### Requirement: Margem por porte não-negativa
O sistema SHALL rejeitar margem de lucro por faixa de porte com valor negativo, tanto para B2C quanto para B2B.

#### Scenario: Tentativa de cadastrar margem negativa
- **WHEN** um usuário autorizado tenta salvar uma faixa de porte com margem B2C de −5%
- **THEN** o sistema rejeita a submissão com uma mensagem de validação, orientando o uso do modo `substituir` para praticar uma margem menor que a margem-alvo global

### Requirement: Acesso restrito a Owner, Sócio e role Financeiro
O sistema SHALL permitir escrita da margem de lucro por faixa de porte apenas a usuários `owner`/`socio` ou com a role `financeiro`, e leitura a `owner`/`socio` ou role `financeiro`/`producao` — mesma regra de acesso já aplicada às faixas de porte e às taxas por canal.

#### Scenario: Usuário de Produção tenta alterar a margem de um porte
- **WHEN** um usuário com apenas a role `producao` tenta salvar uma nova margem para a faixa de porte M
- **THEN** o sistema rejeita a escrita, pois margem de lucro é responsabilidade financeira
