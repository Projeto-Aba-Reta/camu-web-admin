## ADDED Requirements

### Requirement: Agregação mensal de receita, gasto e lucro
O sistema SHALL agregar, por mês, a receita (soma dos totais de venda dos pedidos), o gasto (soma dos custos reais desses pedidos) e o lucro (receita menos gasto), atribuindo cada pedido ao mês da sua data de criação.

#### Scenario: Mês com vendas e custos
- **WHEN** um mês tem três pedidos somando R$ 300,00 de venda e R$ 110,00 de custo real
- **THEN** o sistema reporta, para esse mês, receita R$ 300,00, gasto R$ 110,00 e lucro R$ 190,00

#### Scenario: Mês sem nenhum pedido
- **WHEN** um mês dentro do período consultado não tem nenhum pedido
- **THEN** o sistema reporta esse mês com receita, gasto e lucro zerados, mantendo-o na série para não abrir buraco no gráfico

#### Scenario: Mês com prejuízo
- **WHEN** o gasto de um mês supera a receita
- **THEN** o sistema reporta lucro negativo para esse mês

### Requirement: Pedidos excluídos e cancelados fora do resultado
O sistema SHALL desconsiderar do resultado de vendas os pedidos cancelados, e SHALL deixar de contabilizar imediatamente qualquer pedido excluído.

#### Scenario: Pedido cancelado
- **WHEN** um pedido de R$ 80,00 é marcado como cancelado
- **THEN** ele deixa de compor a receita e o gasto do mês correspondente

#### Scenario: Pedido excluído
- **WHEN** um pedido é excluído do sistema
- **THEN** o resultado do mês é recalculado sem ele

### Requirement: Período consultado
O sistema SHALL exibir por padrão os últimos 12 meses encerrados mais o mês corrente, e SHALL permitir ao usuário escolher outro intervalo de meses. O intervalo escolhido SHALL viajar na URL, de modo que a visão seja compartilhável e recarregável.

#### Scenario: Abertura sem parâmetros
- **WHEN** um usuário abre a tela de resultado sem informar período
- **THEN** o sistema exibe a série dos últimos 12 meses encerrados mais o mês corrente

#### Scenario: Período informado na URL
- **WHEN** um usuário acessa a tela com um intervalo de meses na URL
- **THEN** o sistema exibe a série daquele intervalo

#### Scenario: Intervalo invertido
- **WHEN** o mês inicial informado é posterior ao mês final
- **THEN** o sistema ignora o intervalo inválido e exibe o período padrão

### Requirement: Gráfico de lucros e gastos
O sistema SHALL exibir a série mensal em um gráfico com receita, gasto e lucro, com eixo horizontal de meses, valores em reais, legenda identificando as três séries e tooltip com os valores do mês sob o cursor. O gráfico SHALL respeitar o tema claro/escuro do dashboard e ser legível em largura de celular.

#### Scenario: Leitura de um mês no gráfico
- **WHEN** um usuário passa o cursor sobre a coluna de um mês
- **THEN** o sistema exibe receita, gasto e lucro daquele mês

#### Scenario: Série sem nenhum dado
- **WHEN** o período consultado não tem nenhum pedido
- **THEN** o sistema exibe uma mensagem de ausência de dados no lugar do gráfico, sem erro

### Requirement: Totais do período
O sistema SHALL exibir, junto ao gráfico, os totais do período consultado — receita total, gasto total, lucro total e margem percentual (lucro dividido pela receita) — além da contagem de pedidos.

#### Scenario: Totais de um período com vendas
- **WHEN** o período consultado tem receita R$ 1.000,00 e gasto R$ 400,00
- **THEN** o sistema exibe lucro R$ 600,00 e margem de 60%

#### Scenario: Margem com receita zero
- **WHEN** o período consultado tem receita zero
- **THEN** o sistema exibe a margem como indisponível em vez de dividir por zero

### Requirement: Recorte por origem de venda
O sistema SHALL exibir a quebra do período por origem de venda, com receita, gasto, lucro e número de pedidos de cada origem, incluindo origens arquivadas que tenham pedidos no período.

#### Scenario: Comparação entre origens
- **WHEN** um usuário consulta um período com vendas em boca-a-boca e em Mercado Livre
- **THEN** o sistema exibe uma linha por origem, com receita, gasto, lucro e contagem de pedidos de cada uma

#### Scenario: Origem arquivada com pedidos no período
- **WHEN** uma origem foi arquivada mas tem pedidos dentro do período consultado
- **THEN** ela aparece na quebra, identificada como arquivada

### Requirement: Acesso ao resultado de vendas
O sistema SHALL permitir leitura do resultado de vendas apenas a `owner`/`socio` ou às roles `vendas` e `financeiro`.

#### Scenario: Produção tenta abrir o resultado
- **WHEN** um usuário com apenas a role `producao` acessa a rota de resultado de vendas
- **THEN** o sistema nega o acesso e o redireciona para a home do dashboard
