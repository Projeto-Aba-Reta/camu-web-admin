# parque-de-impressoras

## Purpose

Catálogo das impressoras do parque, com custo de depreciação por hora versionado no tempo, consumido pelo motor de cálculo de preço.

## Requirements

### Requirement: Cadastro de impressoras com depreciação por hora
O sistema SHALL manter um catálogo de impressoras do parque, cada uma com nome, modelo e custo de depreciação por hora, podendo ser marcada como ativa ou inativa.

#### Scenario: Cadastro de nova impressora do parque
- **WHEN** um usuário autorizado cadastra uma nova impressora com nome, modelo e depreciação por hora
- **THEN** o sistema cria o registro com `is_active = true` por padrão

### Requirement: Depreciação por hora versionada por vigência
Ao alterar o custo de depreciação por hora de uma impressora existente, o sistema SHALL criar um novo registro vinculado ao mesmo nome/modelo com nova vigência, preservando o valor anterior para cálculos já realizados.

#### Scenario: Ajuste de depreciação de uma máquina existente
- **WHEN** o valor de depreciação por hora da Ender-3 V3 SE é revisado
- **THEN** o sistema insere um novo registro com `valid_from = now()` para essa máquina, sem alterar o registro anterior

### Requirement: Impressora inativa não aparece como opção de cálculo
O sistema SHALL excluir impressoras com `is_active = false` das opções disponíveis para um novo cálculo de preço.

#### Scenario: Impressora desativada
- **WHEN** uma impressora é marcada como inativa
- **THEN** o sistema deixa de oferecê-la como opção ao iniciar um novo cálculo de preço, mas mantém os cálculos históricos que a referenciam

### Requirement: Acesso de escrita a Owner, Sócio e role Produção
O sistema SHALL permitir cadastro e leitura do parque de impressoras a usuários `owner`/`socio` ou com role `producao`, e leitura adicional à role `financeiro` (que consome a depreciação no cálculo de preço, mas não altera o parque físico).

#### Scenario: Usuário de Financeiro tenta cadastrar impressora
- **WHEN** um usuário com apenas a role `financeiro` tenta cadastrar uma nova impressora
- **THEN** o sistema rejeita a escrita, pois o cadastro do parque físico é responsabilidade de `producao` (ou `owner`/`socio`)
