## MODIFIED Requirements

### Requirement: Comando único para popular dados iniciais de todo o sistema
O sistema SHALL disponibilizar um comando orquestrador único (`make seed` / `npm run seed-all`) que popula o banco, em ordem de dependência, com dados de exemplo de todos os domínios do painel: roles e divisão sócio→área (incluindo a role "Ideação de Produtos"), precificação (impressoras, parâmetros de custo, taxas por canal, faixas de porte), estoque de insumos e de peças prontas, catálogo de produtos, societário, fila de impressão, calendário de marketing e organizador de ideação de produtos — utilizável em qualquer ambiente configurado via `.env`, sem exigir nenhuma configuração manual prévia.

#### Scenario: Execução em banco vazio
- **WHEN** o comando orquestrador é executado contra um banco sem nenhum dado cadastrado
- **THEN** o sistema cria, em sequência, as roles (incluindo Produção, Marketplace/Vendas, Site, Assinatura, Infra/Automação, Financeiro, Societário e Ideação de Produtos) e os usuários de exemplo, os parâmetros de precificação e o parque de impressoras, o estoque inicial de insumos, o catálogo de produtos de exemplo com estoque de peças prontas, os dados societários, os itens de exemplo da fila de impressão, e as datas comemorativas e itens de exemplo de marketing e de ideação de produtos

#### Scenario: Execução com apenas parte dos dados já presente
- **WHEN** o comando orquestrador é executado novamente após uma execução parcial anterior (ex. só os domínios de precificação e catálogo já populados)
- **THEN** o sistema pula os dados já existentes de cada domínio e completa apenas o que ainda falta, sem duplicar nada

## ADDED Requirements

### Requirement: Seed de exemplo da fila de impressão
O sistema SHALL disponibilizar um comando (`npm run seed-fila-impressao`) que popula a fila de impressão com itens de exemplo, incluindo ao menos um item em `na_fila` e um item `concluido` (este último já refletindo as movimentações de estoque correspondentes), reaproveitando produtos, impressoras e materiais já semeados por `seed-catalog`/`seed-pricing`/`seed-inventory`.

#### Scenario: Execução após seed-catalog
- **WHEN** o comando `seed-fila-impressao` é executado após `seed-catalog` já ter rodado
- **THEN** o sistema cria itens de exemplo na fila referenciando produtos, impressora e material já existentes, sem exigir nenhum cadastro manual antes de navegar a tela de fila de impressão

### Requirement: Seed de exemplo do calendário de marketing
O sistema SHALL disponibilizar um comando (`npm run seed-marketing`) que popula a lista de datas comemorativas de marketing com datas nacionais relevantes (Natal, Dia das Mães, Dia dos Pais, Black Friday, Dia dos Namorados, Páscoa, Dia das Crianças) e 1-2 posts de exemplo em status variados do funil de conteúdo.

#### Scenario: Execução em banco vazio
- **WHEN** o comando `seed-marketing` é executado contra um banco sem nenhuma data comemorativa de marketing cadastrada
- **THEN** o sistema cria as datas comemorativas nacionais e os posts de exemplo, disponíveis para navegar as visões de calendário e de board

### Requirement: Seed de exemplo do organizador de ideação de produtos
O sistema SHALL disponibilizar um comando (`npm run seed-ideacao-produtos`) que popula a lista própria de datas comemorativas de produto com as mesmas datas nacionais usadas pelo seed de marketing e 1-2 ideias de produto de exemplo vinculadas, reaproveitando o responsável de exemplo da role "Ideação de Produtos" já criada por `seed-roles`.

#### Scenario: Execução após seed-roles
- **WHEN** o comando `seed-ideacao-produtos` é executado após `seed-roles` já ter criado a role e o usuário de exemplo de "Ideação de Produtos"
- **THEN** o sistema cria as datas comemorativas de produto e as ideias de exemplo, vinculando o responsável de exemplo já existente

### Requirement: Nova role de exemplo "Ideação de Produtos"
O sistema SHALL incluir, no comando `seed-roles`, a criação da role "Ideação de Produtos" (com sub-role e um usuário de exemplo como responsável/head), seguindo o mesmo padrão das demais áreas de sócio já semeadas.

#### Scenario: Execução do seed-roles
- **WHEN** o comando `seed-roles` é executado contra um banco sem a role "Ideação de Produtos" cadastrada
- **THEN** o sistema cria essa role, sua sub-role e um usuário de exemplo atribuído como responsável, junto com as demais 7 roles já existentes
