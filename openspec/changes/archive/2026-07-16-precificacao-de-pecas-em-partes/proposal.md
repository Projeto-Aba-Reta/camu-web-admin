## Why

Muitas peças do catálogo são impressas em partes — cada parte pode usar um filamento diferente e ser impressa em uma impressora diferente — mas hoje o motor de cálculo só sabe precificar uma peça a partir de um único peso/tempo e usa o **preço global de filamento por kg**, ignorando qual filamento (cor/fornecedor) foi de fato usado. Além disso, a peça composta atual só sabe somar o custo de outras **peças vendáveis do catálogo**, e não existe forma de cadastrar as partes internas (não vendáveis) que formam um conjunto. Isso torna a precificação de conjuntos impressos em partes imprecisa e trabalhosa. Este é um domínio de **Produção/catálogo + Financeiro (precificação)**.

## What Changes

- **Partes inline em peça composta**: no cadastro de uma peça `composta`, passa a ser possível cadastrar N **partes** — itens leves, **não vendáveis separadamente** —, cada uma com nome, quantidade, filamento (vínculo a um insumo do estoque), gramas na peça, gramas em suporte, impressora e tempo de impressão.
- **Vínculo de filamento ao estoque de insumos**: cada parte (e cada linha de material de ficha de fatiamento) pode apontar para um insumo de filamento cadastrado no estoque, de onde o custo por kg é derivado. Quando não há vínculo, o cálculo usa o preço global de filamento por kg (fallback), preservando os cálculos atuais.
- **Unidade de filamento padronizada em kg ou g**: insumos do tipo filamento passam a exigir unidade de medida `kg` ou `g`, garantindo que o custo por kg seja sempre resolvível e que a baixa de estoque na fila de impressão seja calculada de forma consistente. **BREAKING** para insumos de filamento cadastrados hoje com outra unidade — exigem normalização por migração.
- **Saldo de insumo em unidade canônica (gramas)**: entradas e saídas de filamento passam a ser normalizadas para gramas ao compor o saldo, de modo que uma compra informada em kg e um consumo em gramas somem corretamente no estoque.
- **Custo de máquina por parte**: energia e depreciação são calculadas por parte (a partir da impressora e do tempo de cada parte) e somadas; reserva de falha incide sobre o subtotal do conjunto e a embalagem é contada uma única vez por conjunto.
- **Custo agregado híbrido**: o custo de uma peça composta passa a somar o custo das partes inline (calculado direto de filamento + máquina) **mais** o custo dos componentes referenciados do catálogo (peças vendáveis) × quantidade — os dois modelos coexistem no mesmo produto.
- **Breakdown por parte na tela de cálculo**: a tela de cálculo de preço por peça exibe o custo de cada parte/componente (filamento, energia, depreciação) e o custo total agregado do conjunto.
- Nenhuma mudança quebra cálculos já salvos: registros de `price_calculations` existentes permanecem inalterados; partes e vínculos de insumo são aditivos.

## Capabilities

### New Capabilities
- `partes-de-peca-composta`: cadastro e gestão das partes inline (não vendáveis) de uma peça composta — nome, quantidade, filamento vinculado ao estoque, gramas na peça/suporte, impressora e tempo de impressão de cada parte, com controle de acesso alinhado ao catálogo (leitura ampla, escrita restrita a Produção).

### Modified Capabilities
- `composicao-de-produto`: peça composta passa a agregar partes inline além de componentes do catálogo; custo agregado soma partes (filamento + máquina) e componentes referenciados × quantidade.
- `motor-de-calculo-de-preco`: custo de filamento derivado do insumo vinculado com fallback ao preço global; custo agregado de peça composta a partir de partes inline (energia/depreciação por parte, reserva de falha sobre o subtotal, embalagem uma vez) somado aos componentes do catálogo.
- `ficha-de-fatiamento`: cada linha de material passa a poder referenciar um insumo de filamento do estoque, de onde o custo por kg é derivado (com fallback ao preço global).
- `estoque-de-insumos`: insumos de filamento passam a exigir unidade `kg` ou `g` e a expor um custo por kg derivado do seu custo de referência, consumível pelo motor de cálculo.
- `movimentacao-de-estoque-de-insumos`: o saldo de filamento passa a ser calculado em unidade canônica (gramas), convertendo compras em kg, de modo que a baixa automática na fila de impressão feche corretamente.
- `calculo-de-preco-por-peca`: a tela exibe o breakdown de custo por parte/componente para peças compostas impressas em partes.

## Impact

- **Domínio de gestão afetado**: Produção/catálogo e Financeiro (precificação). Sem dependência com regras do camu-docs (não altera controle financeiro nem gatilhos de migração MEI/ME).
- **Dados**: nova tabela `product_parts` para partes de peça composta; CHECK de unidade (`kg`/`g`) em `materials` do tipo filamento e migração de normalização dos insumos existentes; nada é removido. A baixa de estoque na fila de impressão já existe (via ficha de fatiamento) e apenas ganha consistência de unidade.
- **Motor de cálculo**: nova resolução de preço de filamento (insumo → fallback global) e nova rotina de agregação por partes; snapshots de cálculo passam a registrar a origem do preço de filamento por parte.
- **UI**: formulário de cadastro de peça composta ganha edição de partes; tela de cálculo de preço ganha breakdown por parte.
- **Acesso**: mesmas regras de RLS já usadas no catálogo (leitura para `owner`/`socio`/`producao`/`financeiro`/`marketing` conforme o caso; escrita restrita a `owner`/`socio`/`producao`).
