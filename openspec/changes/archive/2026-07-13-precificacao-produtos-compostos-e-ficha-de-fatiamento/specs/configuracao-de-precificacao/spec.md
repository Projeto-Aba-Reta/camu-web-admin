## MODIFIED Requirements

### Requirement: Tela de configuração de parâmetros de custo
O sistema SHALL exibir uma tela onde usuários autorizados visualizam os parâmetros de custo vigentes (filamento, energia, consumo, reserva de falha, embalagem e margem-alvo B2C) e submetem novos valores, cada submissão criando um novo registro versionado sem alterar o anterior.

#### Scenario: Owner atualiza o preço do filamento pela tela
- **WHEN** o Owner preenche um novo valor de preço de filamento e salva
- **THEN** o sistema cria um novo registro de parâmetros de custo e a tela passa a exibir esse novo valor como vigente

#### Scenario: Owner atualiza a margem-alvo B2C pela tela
- **WHEN** o Owner preenche um novo percentual de margem-alvo B2C e salva
- **THEN** o sistema cria um novo registro de parâmetros de custo com o novo percentual e a tela passa a exibi-lo como vigente

## MODIFIED Requirements

### Requirement: Escrita restrita por regra de acesso do domínio
A tela SHALL permitir submissão de novos parâmetros de custo, taxas de canal e faixas de precificação B2B apenas a usuários `owner`/`socio` ou com a role `financeiro`, e submissão de cadastro/atualização de impressoras a `owner`/`socio` ou role `producao`, refletindo na interface (desabilitando os formulários) quando o usuário autenticado não tiver a permissão correspondente.

#### Scenario: Usuário de Produção acessa a tela de configuração
- **WHEN** um usuário com apenas a role `producao` abre a tela de configuração de precificação
- **THEN** o formulário de parâmetros de custo, de taxas de canal e de faixas B2B aparece desabilitado, mas o formulário de parque de impressoras permanece editável

## ADDED Requirements

### Requirement: Tela de configuração de faixas de desconto por volume B2B
O sistema SHALL exibir uma tela para cadastrar e atualizar as faixas de precificação B2B (quantidade mínima e margem-alvo por faixa), criando um novo registro versionado por atualização.

#### Scenario: Cadastro de faixa B2B pela tela
- **WHEN** um usuário autorizado preenche quantidade mínima e margem-alvo de uma nova faixa B2B e salva
- **THEN** o sistema cria o registro de faixa e ela passa a ser usada nos cálculos de preço B2B seguintes
