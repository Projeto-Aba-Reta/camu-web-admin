## Context

O schema, o motor de cálculo (`pricing-service.calculatePrice`/`calculateAndSavePrice`) e as policies de RLS já existem via `precificacao-schema-motor-calculo`. O shell autenticado (sidebar, topbar, design system denso/utilitário) já existe via `fundacao-sidebar-e-shell`. `navegacao-por-area` já prevê que um item de sidebar fica não clicável até existir rota registrada para o slug da role — hoje o slug `financeiro` (e `producao`) ainda não tem rota, então a sidebar já reserva o espaço mas não navega para lugar nenhum.

## Goals / Non-Goals

**Goals:**
- Tela de configuração que trata cada parâmetro como um novo registro versionado (nunca update in-place), refletindo fielmente o schema.
- Tela de cálculo que reproduz a fórmula de `custo-por-peca.md` de forma legível — quem já usa a planilha do `camu-docs` deve reconhecer os mesmos termos e ordem.
- Histórico de cálculos consultável sem recálculo (mostra exatamente o snapshot salvo).
- Ativar a navegação real para o slug `financeiro`, cumprindo o contrato já definido por `navegacao-por-area`.

**Non-Goals:**
- Qualquer vínculo com uma peça de catálogo real (não existe ainda).
- Comparação automática de custo estimado x custo real (depende de dados de produção/estoque futuros).
- Edição/exclusão de um registro histórico de parâmetro — histórico é append-only, a UI não expõe edição retroativa.
- Upload/leitura automática de arquivo de fatiador — input de peso/tempo é manual nesta fase.

## Decisions

### 1. Configuração como formulário "criar novo registro", não "editar registro existente"
Cada seção da tela de configuração (parâmetros de custo, impressoras, taxas de canal, faixas de porte) mostra o valor vigente como estado inicial de um formulário que, ao salvar, sempre faz um `insert` (nunca `update`) — espelhando a Decision 1 do `design.md` do change de schema. A tela deixa isso explícito com um rótulo "Atualizar (cria novo registro, o anterior fica no histórico)" ao lado do botão salvar, para não confundir o Owner/Sócio acostumado a formulários de edição tradicionais. **Alternativa considerada**: formulário de "editar" comum, com o versionamento acontecendo de forma transparente no backend. Rejeitada porque esconderia do usuário que uma mudança de preço de filamento não afeta cálculos já feitos — informação relevante para quem está revisando custo real x estimado.

### 2. Uma página de resultado, três blocos visuais
A tela de cálculo (`/financeiro/precificacao/calcular`) é uma página única: formulário de input no topo, e o resultado (quando existe) em três blocos abaixo — breakdown de custo (lista com os 5 componentes e o total), porte sugerido (badge P/M/G, ou aviso de ambiguidade quando as faixas conflitam) e tabela de preço por canal (canal, preço sugerido, margem). Isso evita navegação extra e deixa o fluxo "preencher → ver resultado" em uma tela só, como o Owner já faz hoje na planilha. **Alternativa considerada**: wizard multi-etapa (peso/tempo → impressora → resultado). Rejeitada por adicionar cliques sem necessidade — os três inputs cabem confortavelmente em um formulário único.

### 3. Ambiguidade de porte como estado explícito na UI, não erro
Quando `pricing-service` retorna as duas faixas candidatas (peso e tempo em faixas diferentes), a UI exibe um alerta (não um erro bloqueante) mostrando as duas opções e deixando o usuário escolher manualmente qual porte usar para a sugestão de preço final — a escolha do usuário é registrada junto do cálculo salvo. **Alternativa considerada**: bloquear o cálculo até o usuário corrigir os inputs. Rejeitada porque peças reais legitimamente caem fora das faixas de referência (ver premissas a validar de `custo-por-peca.md`) — bloquear forçaria o usuário a mentir os números só para prosseguir.

### 4. Rotas de área e navegação
Adiciona a entrada `financeiro -> /financeiro/precificacao/calcular` (página padrão da área) no registro de rotas de área consumido por `navegacao-por-area` (mesmo mecanismo já usado por outras áreas). A tela de configuração fica em uma sub-rota (`/financeiro/precificacao/configuracao`) acessada por um link dentro da própria área, não como item de sidebar próprio — evita poluir a sidebar com sub-itens antes de haver mais de uma seção dentro de Financeiro.

### 5. Componentes reaproveitando o design system do dashboard
Formulários usam os componentes de formulário/input já estabelecidos por `fundacao-sidebar-e-shell` (bordas finas, raio moderado, paleta de marca) — nenhum componente novo de estilo "Sticker Pop" da landing page. Tabelas (histórico de cálculos) usam o mesmo padrão de listagem (TanStack Table) já usado em `admin/roles` e `admin/usuarios`, para consistência de UX dentro do painel.

## Risks / Trade-offs

- **[Risco]** Expor o versionamento explícito na UI ("cria novo registro") pode confundir usuários não técnicos que esperam um "editar" comum. → **Mitigação**: copy explicativa no formulário + histórico visível logo abaixo, tornando o comportamento auto-evidente.
- **[Risco]** Ambiguidade de porte deixada para escolha manual do usuário introduz subjetividade no preço sugerido. → **Mitigação**: aceito conscientemente — é reflexo de uma limitação real das faixas de referência do `camu-docs`, não um bug; a escolha fica registrada em `price_calculations` para auditoria futura.
- **[Risco]** Rota única `financeiro -> /financeiro/precificacao/calcular` assume que Financeiro não terá outras sub-áreas concorrendo pelo mesmo item de sidebar antes de uma fase futura organizar isso melhor. → **Mitigação**: aceitável para esta fase (única funcionalidade financeira existente); revisitar navegação quando outra capability financeira for adicionada.

## Migration Plan

1. Implementar as telas consumindo os services já existentes (nenhuma migration de banco neste change).
2. Registrar a rota de área para `financeiro` no registro consumido por `navegacao-por-area`.
3. Sem dado a migrar — change é só de UI sobre schema já existente.

## Open Questions

- Se/quando `producao` precisar de uma tela própria de leitura de parâmetros (hoje só acessa via cálculo), avaliar se isso justifica uma segunda rota de área ou uma aba dentro da mesma tela.
