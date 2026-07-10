## Why

`precificacao-schema-motor-calculo` entrega o schema e o motor de cálculo, mas sem UI ninguém no painel consegue configurar os parâmetros ou calcular o preço de uma peça — a única forma de operar seria SQL direto no Supabase Studio. Este change entrega as telas que fecham a Fase de Precificação: configuração dos parâmetros globais e a tela onde o Financeiro/Produção informa peso e tempo do fatiador para obter custo, porte e preço sugerido por canal. Sem isso, `catalogo-schema` (próxima fase) não teria como o Owner/Sócio efetivamente precificar uma peça nova ao cadastrá-la.

## What Changes

- Cria a tela de **configuração de precificação** em `(dashboard)/financeiro/precificacao/configuracao`: formulários para revisar/atualizar parâmetros de custo globais, parque de impressoras, taxas por canal e faixas de porte P/M/G — cada atualização cria um novo registro versionado (nunca edita in-place, conforme o schema), com visualização do histórico de mudanças de cada parâmetro.
- Cria a tela de **cálculo de preço por peça** em `(dashboard)/financeiro/precificacao/calcular`: formulário com peso (g), tempo de impressão (h) e seleção da impressora ativa; ao submeter, exibe o breakdown de custo (filamento/energia/depreciação/reserva/embalagem), o porte sugerido (com aviso quando peso e tempo indicarem portes conflitantes) e uma tabela de preço sugerido + margem por canal ativo.
- Cria o **histórico de cálculos** (mesma área): listagem dos cálculos já executados, com filtro por período e por porte sugerido, permitindo consultar o resultado exato registrado no momento (sem recalcular com parâmetros atuais).
- Registra a rota de área para o slug `financeiro` (e leitura equivalente para `producao`) no registro de rotas de área consumido por `navegacao-por-area`, tornando o item "Financeiro" da sidebar clicável.
- Restringe escrita nas telas de configuração a Owner/Sócio/role `financeiro` (mesma regra do schema); a tela de cálculo fica acessível também para `producao` em modo leitura+execução, sem acesso à configuração de parâmetros.

## Capabilities

### New Capabilities
- `configuracao-de-precificacao`: telas de configuração dos parâmetros de custo, parque de impressoras, taxas por canal e faixas de porte, com histórico de alterações visível.
- `calculo-de-preco-por-peca`: tela de cálculo de preço a partir de peso/tempo de impressão, com breakdown de custo, porte sugerido e preço/margem por canal, e histórico de cálculos executados.

### Modified Capabilities
(nenhuma — `navegacao-por-area` não muda de requisito; este change só adiciona uma entrada de rota real para o slug `financeiro` no registro já previsto por essa capability, satisfazendo o requisito existente "item só é clicável se houver rota implementada")

## Impact

- **Depende de**: `precificacao-schema-motor-calculo` (schema, repositórios e `pricing-service`), `fundacao-sidebar-e-shell` (registro de rotas de área e componentes de shell/design system), `fundacao-admin-roles-usuarios` (existência real das roles `financeiro`/`producao` no banco).
- **Novo**: `src/app/(dashboard)/financeiro/precificacao/{configuracao,calcular,historico}/page.tsx`, `src/components/precificacao/{parametros-form,impressora-form,canal-fee-form,size-tier-form,calculo-form,resultado-calculo,historico-tabela}.tsx`.
- **Domínio de gestão**: Financeiro (com leitura/uso compartilhado por Produção) — primeira UI de domínio de negócio do painel, fora do escopo de fundação/plataforma.
- **Dependência de `camu-docs`**: direta — os rótulos e a ordem dos campos das telas seguem a fórmula e a nomenclatura de `03-financeiro/custo-por-peca.md` e as taxas de `06-marketplace/estrategia-canais.md`, para que quem já conhece a planilha reconheça a tela sem re-treinamento.
- Fecha a fase de Precificação do roadmap do painel — a partir daqui, `catalogo-schema`/`catalogo-telas` podem assumir que uma peça nova sempre tem um cálculo de preço vinculável.
