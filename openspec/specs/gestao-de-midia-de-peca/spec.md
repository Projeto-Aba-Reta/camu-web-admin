# gestao-de-midia-de-peca

## Purpose

Tela de gestão de mídia (fotos) de peças do catálogo: upload direto ao storage, reordenação por arrastar e soltar, definição de foto de capa, remoção, e controle de acesso restrito a Produção.

## Requirements

### Requirement: Upload de foto vinculada a uma peça
O sistema SHALL permitir o upload de uma ou mais fotos para uma peça, enviando o arquivo diretamente ao storage configurado e registrando a referência resultante.

#### Scenario: Upload de uma nova foto
- **WHEN** um usuário autorizado envia um arquivo de imagem para uma peça
- **THEN** o sistema armazena o arquivo no bucket configurado e cria o registro de mídia correspondente

### Requirement: Reordenação de fotos por arrastar
O sistema SHALL permitir reordenar as fotos de uma peça por arrastar e soltar, persistindo a nova ordem.

#### Scenario: Reordenação de duas fotos
- **WHEN** um usuário arrasta a segunda foto de uma peça para a primeira posição
- **THEN** o sistema persiste a nova ordem de exibição das fotos dessa peça

### Requirement: Definição de foto de capa
O sistema SHALL permitir marcar uma foto como capa da peça, desmarcando automaticamente qualquer capa anterior.

#### Scenario: Troca de capa
- **WHEN** um usuário marca uma foto diferente da atual como capa
- **THEN** o sistema atualiza a capa da peça, garantindo que apenas uma foto permaneça marcada como capa

### Requirement: Remoção de foto
O sistema SHALL permitir remover uma foto de uma peça, excluindo o registro de mídia e o arquivo correspondente no storage.

#### Scenario: Remoção de uma foto existente
- **WHEN** um usuário autorizado remove uma foto de uma peça
- **THEN** o sistema exclui o registro de mídia e o arquivo do storage associado

### Requirement: Acesso de gestão de mídia restrito a Produção
O sistema SHALL permitir upload, reordenação, definição de capa e remoção de fotos apenas a usuários `owner`/`socio` ou com a role `producao`.

#### Scenario: Usuário de Marketing tenta enviar uma foto
- **WHEN** um usuário com apenas a role `marketing` tenta enviar uma foto para uma peça
- **THEN** o sistema rejeita a ação, exibindo a galeria de fotos em modo somente leitura

