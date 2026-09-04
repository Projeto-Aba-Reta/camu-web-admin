# deep-link-de-pedido-por-codigo

## Purpose

Acesso direto ao detalhe de um pedido a partir do seu `order_code`, permitindo que sistemas externos (como a notificação de venda da landing page da loja própria) linkem diretamente para o pedido no admin sem conhecer seu id interno.

## Requirements

### Requirement: Resolver pedido pelo código na URL

O sistema SHALL expor a rota `/vendas/pedidos/codigo/[orderCode]` que localiza o pedido pelo `order_code` e entrega o detalhe do pedido. Quando o código não corresponder a nenhum pedido, o sistema SHALL responder com "não encontrado". A rota SHALL exigir os mesmos direitos de leitura do detalhe do pedido.

#### Scenario: Código válido
- **WHEN** um usuário autenticado com acesso a vendas abre `/vendas/pedidos/codigo/A1B2C3` e existe um pedido com esse código
- **THEN** o sistema exibe o detalhe desse pedido (redirecionando ou renderizando diretamente)

#### Scenario: Código inexistente
- **WHEN** um usuário abre `/vendas/pedidos/codigo/ZZZZZZ` e nenhum pedido tem esse código
- **THEN** o sistema responde "pedido não encontrado"

#### Scenario: Usuário sem acesso a vendas
- **WHEN** um usuário sem role de vendas/produção/precificação nem `owner`/`socio` abre o link
- **THEN** o sistema nega o acesso, como faz no detalhe do pedido por id

### Requirement: Link estável para uso externo

A rota por código SHALL ser tratada como contrato estável para links externos (notificação de venda da loja própria), montada como `${ADMIN_BASE_URL}/vendas/pedidos/codigo/{order_code}` pelo repositório `camu-web-landing-page`.

#### Scenario: Link vindo da notificação de venda
- **WHEN** o time clica em "Abrir no admin" na notificação de venda de um pedido pago
- **THEN** o link abre o detalhe do pedido correspondente no admin
