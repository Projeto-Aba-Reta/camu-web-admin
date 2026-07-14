## MODIFIED Requirements

### Requirement: Acesso de gestão de mídia restrito a Produção
O sistema SHALL permitir upload, reordenação, definição de capa e remoção de fotos apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Marketing tenta enviar uma foto
- **WHEN** um usuário com apenas a role `marketing` tenta enviar uma foto para uma peça
- **THEN** o sistema rejeita a ação, exibindo a galeria de fotos em modo somente leitura
