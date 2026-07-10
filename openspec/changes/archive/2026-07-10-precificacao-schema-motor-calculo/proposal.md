## Why

A Fase 1 (Fundação) entrega login, controle de acesso e o shell do dashboard, mas o painel ainda não sabe responder à pergunta mais básica do domínio Financeiro/Produção: quanto cobrar por uma peça. Hoje essa conta vive só em `camu-docs/03-financeiro/custo-por-peca.md` (fórmula manual aplicada em planilha). Antes de existir um catálogo de peças (`catalogo-schema`) ou controle de estoque, o painel precisa de um motor de cálculo de preço confiável e configurável — sem ele, qualquer peça cadastrada depois nasceria sem preço sugerido, e o catálogo teria que reinventar essa regra. Este change constrói a base de dados e o motor de cálculo; a UI de configuração e a tela de precificação por peça ficam para o change seguinte (`precificacao-telas`).

## What Changes

- Cria schema Supabase para **parâmetros de custo globais versionados no tempo**: preço do filamento (R$/kg), custo de energia (R$/kWh), consumo médio de impressão (W), reserva percentual para falha de impressão, custo de embalagem — cada alteração gera uma nova linha com vigência (`valid_from`), preservando o histórico usado para comparar custo estimado x real.
- Cria schema para o **parque de impressoras**, com custo de depreciação por hora (R$/h) por máquina (Ender-3 V3 SE hoje; Creality K1 Max e Bambu Lab A1 Combo entram como registros futuros do mesmo catálogo, conforme `camu-docs/03-financeiro/roadmap-impressoras.md`).
- Cria schema para **taxas por canal de marketplace** (Mercado Livre, Shopee, TikTok Shop, Amazon, SHEIN): percentual da venda + taxa fixa opcional, também versionado no tempo (taxas mudam com frequência — ver ressalva em `camu-docs/06-marketplace/estrategia-canais.md`).
- Cria schema para **faixas de porte P/M/G** (limites de referência de peso/tempo que classificam uma peça), usado pelo motor de cálculo para sugerir o porte a partir dos dados do fatiador.
- Cria schema para **registro de cálculo de preço** (histórico de cada cálculo executado): inputs (peso em gramas, tempo de impressão em horas, impressora usada), e outputs (custo total, breakdown por componente, porte sugerido, preço sugerido e margem por canal).
- Implementa o **motor de cálculo** (service) que aplica a fórmula `custo = filamento + energia + depreciação + reserva de falha + embalagem` a partir dos inputs de fatiamento e dos parâmetros vigentes, classifica o porte e projeta preço/margem por canal ativo.
- Habilita RLS nas tabelas acima seguindo o modelo já existente em `controle-de-acesso`: acesso irrestrito para Owner/Sócio; leitura (e, quando fizer sentido, escrita) liberada também para usuários com a role "Financeiro" ou "Produção", já que são áreas que legitimamente consultam/ajustam esses parâmetros no dia a dia.

Não incluído neste change: telas de configuração de parâmetros, tela de precificação por peça (ambas em `precificacao-telas`), e vínculo com uma entidade de peça/produto real (ainda não existe — vem em `catalogo-schema`, que vai referenciar o resultado deste motor).

## Capabilities

### New Capabilities
- `parametros-de-custo`: parâmetros globais de custo (filamento, energia, consumo, reserva de falha, embalagem) versionados no tempo, com vigência rastreável.
- `parque-de-impressoras`: catálogo de impressoras com custo de depreciação por hora, usado pelo motor de cálculo.
- `taxas-por-canal`: taxas de comissão (percentual + fixo) por canal de marketplace, versionadas no tempo.
- `motor-de-calculo-de-preco`: cálculo de custo/porte/preço sugerido por canal a partir de peso e tempo de impressão informados pelo fatiador, com histórico de cálculos executados.

### Modified Capabilities
(nenhuma — `controle-de-acesso` não muda de requisito; este change só consome as funções `has_role(slug)`/`has_sub_role(slug)` já especificadas por `fundacao-schema-auth` para as novas policies de RLS)

## Impact

- **Novo**: migrations Supabase para `cost_parameters`, `printers`, `channel_fees`, `size_tier_ranges`, `price_calculations` (nomes definitivos a confirmar em `design.md`).
- **Novo**: `src/lib/repositories/interfaces/{cost-parameter,printer,channel-fee,price-calculation}-repository.interface.ts` + implementações Supabase, seguindo o padrão de `IRoleRepository`/`IUserRepository` já usado em `fundacao-schema-auth`.
- **Novo**: `src/lib/services/pricing-service.ts` com o motor de cálculo.
- **Domínio de gestão**: Financeiro e Produção — a fórmula de custo e as faixas de porte pertencem ao controle financeiro, mas parque de impressoras e classificação de porte também alimentam diretamente a fila de produção.
- **Dependência de `camu-docs`**: direta e explícita — a fórmula de custo, os valores de referência (filamento ~R$90/kg, energia ~R$0,80/kWh, depreciação SE R$0,80/h) e as faixas P/M/G vêm de `03-financeiro/custo-por-peca.md`; as taxas por canal vêm de `06-marketplace/estrategia-canais.md`; o parque de impressoras (máquinas e ordem de expansão) vem de `03-financeiro/roadmap-impressoras.md`. Todos esses valores são explicitamente marcados como "premissas a validar" no `camu-docs` — os parâmetros devem nascer editáveis pelo Owner/Sócio, nunca hardcoded no motor de cálculo.
- Habilita os changes seguintes: `precificacao-telas` (consome este schema/motor para a UI) e, mais adiante, `catalogo-schema` (referencia `price_calculations` ao cadastrar uma peça).
