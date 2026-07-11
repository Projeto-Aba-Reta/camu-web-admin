## Why

`estoque-schema` entrega o schema de insumos, movimentações e peças prontas, mas sem UI a operação continuaria só na cabeça de quem produz — sem visibilidade de saldo, sem alerta de reposição e sem registro confiável de quanto já foi produzido. Este change entrega as telas que fecham a Fase de Estoque, permitindo que Produção registre movimentações no dia a dia e que Financeiro acompanhe o valor de estoque parado para o fechamento mensal.

## What Changes

- Cria a tela de **estoque de insumos** em `(dashboard)/producao/estoque/insumos`: listagem de insumos com saldo atual, custo de referência, indicador de estoque baixo, e ação de registrar nova movimentação (compra, consumo em produção, perda/refugo, ajuste manual).
- Cria o formulário de **registro de consumo em produção**, com opção de, na mesma ação, registrar a entrada da peça pronta correspondente (vínculo opcional já modelado no schema) — reduz a chance de esquecer o segundo lançamento.
- Cria a tela de **configuração de limite mínimo** por insumo, dentro do detalhe de cada insumo.
- Cria a tela de **estoque de peças prontas** em `(dashboard)/producao/estoque/pecas`: saldo disponível por peça do catálogo, com ação de registrar produção, venda, perda ou ajuste manual.
- Adiciona indicador de estoque baixo na sidebar/topbar (badge ou contagem) visível a Owner/Sócio/`producao`, para chamar atenção sem exigir que o usuário entre na tela para descobrir.
- Sub-rotas registradas dentro da área `producao` já existente (de `catalogo-telas`) — não introduz um novo item de sidebar, apenas navegação interna dentro da área de Produção.

## Capabilities

### New Capabilities
- `gestao-de-estoque-de-insumos`: telas de listagem, registro de movimentação e configuração de limite mínimo de insumos.
- `gestao-de-estoque-de-pecas-prontas`: telas de saldo e registro de movimentação de peças prontas do catálogo.
- `indicador-de-estoque-baixo`: exibição de alerta visível fora da tela de estoque (sidebar/topbar) quando houver insumo abaixo do limite.

### Modified Capabilities
(nenhuma — `navegacao-por-area` não muda de requisito; as novas telas são sub-rotas da área `producao` já registrada por `catalogo-telas`)

## Impact

- **Depende de**: `estoque-schema` (schema, repositórios, `inventory-service`), `catalogo-schema`/`catalogo-telas` (peças do catálogo, área `producao` já registrada), `fundacao-sidebar-e-shell` (shell/design system, topbar para o indicador de alerta).
- **Novo**: `src/app/(dashboard)/producao/estoque/{insumos,pecas}/page.tsx` e detalhes, `src/components/estoque/{material-form,material-movement-form,material-threshold-form,product-movement-form,low-stock-badge}.tsx`.
- **Domínio de gestão**: Produção (com leitura por Financeiro para acompanhamento de valor de estoque).
- **Dependência de `camu-docs`**: indireta — mesma lacuna já registrada em `estoque-schema` (não há doc de controle de estoque físico hoje); esta UI é o primeiro lugar onde esse controle passa a existir de fato, o que reforça a sugestão de documentar o processo no `camu-docs` depois de validado em uso real.
- Fecha a fase de Estoque do roadmap do painel — junto com Precificação e Catálogo, completa o núcleo operacional de Produção antes da fase de Societário/Governança.
