## ADDED Requirements

### Requirement: Múltiplas fotos vinculadas a uma peça
O sistema SHALL permitir vincular múltiplos registros de mídia a uma mesma peça, cada um referenciando um arquivo já hospedado e uma posição de exibição.

#### Scenario: Peça com três fotos
- **WHEN** três registros de mídia são vinculados à mesma peça, cada um com uma `display_order` diferente
- **THEN** o sistema persiste os três vínculos e os retorna ordenados por `display_order`

### Requirement: No máximo uma foto de capa por peça
O sistema SHALL garantir que, para cada peça, no máximo um registro de mídia tenha a flag de capa marcada como verdadeira.

#### Scenario: Marcar uma segunda foto como capa
- **WHEN** uma foto já marcada como capa existe para uma peça e uma segunda foto é marcada como capa
- **THEN** o sistema desmarca a capa anterior automaticamente ou rejeita a operação, garantindo no máximo uma capa ativa

### Requirement: Remoção de peça remove sua mídia
Ao remover uma peça, o sistema SHALL remover em cascata todos os registros de mídia vinculados a ela.

#### Scenario: Exclusão de peça com fotos vinculadas
- **WHEN** uma peça com fotos vinculadas é excluída
- **THEN** o sistema remove também todos os registros de mídia associados a essa peça

### Requirement: Acesso de escrita restrito a Produção
O sistema SHALL permitir adicionar, reordenar ou remover mídia de uma peça apenas a usuários `owner`/`socio` ou com a role `producao`, com leitura ampla equivalente à leitura de peças.

#### Scenario: Usuário de Financeiro tenta remover uma foto
- **WHEN** um usuário com apenas a role `financeiro` tenta remover uma foto de uma peça
- **THEN** o sistema rejeita a escrita por Row Level Security
