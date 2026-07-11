## Why

`societario-schema` entrega o schema de acordo de sociedade, capital, enquadramento jurídico, gatilhos de migração, faturamento x teto do MEI e log de decisões, mas sem UI esses dados continuariam só no `camu-docs`. Este change entrega as telas que fecham a última fase deste roadmap, dando aos 3 sócios um painel único para consultar o estado societário atual — de "quanto cada um contribuiu" a "estamos perto do teto do MEI" — sem precisar abrir outro repositório.

## What Changes

- Cria a tela de **acordo de sociedade** em `(dashboard)/societario/acordo`: regra de divisão de lucro e condições de saída vigentes, com histórico de mudanças, e a lista de contribuições de capital por sócio (com referência de comprovante).
- Cria a tela de **enquadramento jurídico** em `(dashboard)/societario/enquadramento`: tipo de PJ vigente (MEI/ME), CNPJ, titular, histórico de mudança, e um painel dos 4 gatilhos de migração com seus status e ação de marcar/reverter como atingido.
- Cria a tela de **faturamento x teto do MEI** em `(dashboard)/societario/faturamento`: lançamento mensal de faturamento acumulado, gráfico/indicador do percentual do teto anual já atingido, e destaque visual para meses sem lançamento.
- Cria a tela de **log de decisões** em `(dashboard)/societario/decisoes`: listagem no formato ADR (mais recente primeiro) e formulário de nova entrada — nunca edição de entrada existente.
- Registra a rota de área para o slug `societario` no registro de rotas de área consumido por `navegacao-por-area`.
- Restringe todas as telas deste change a usuários `owner`/`socio` — nenhum `member`, mesmo com a role `societario` atribuída (a role existe para fins de navegação/organização, mas o acesso de dado real continua condicionado ao `user_type`, conforme já modelado em `societario-schema`).

## Capabilities

### New Capabilities
- `tela-de-acordo-de-sociedade`: consulta e atualização da regra de divisão de lucro, condições de saída e contribuições de capital.
- `tela-de-enquadramento-juridico`: consulta e atualização do tipo de PJ vigente e do painel de gatilhos de migração.
- `tela-de-faturamento-x-teto`: lançamento mensal de faturamento e visualização do percentual do teto do MEI atingido.
- `tela-de-log-de-decisoes`: listagem e registro de novas entradas do log de decisões.

### Modified Capabilities
(nenhuma — `navegacao-por-area` não muda de requisito; este change só adiciona uma entrada de rota real para o slug `societario`, já previsto por essa capability)

## Impact

- **Depende de**: `societario-schema` (schema, repositórios, `governance-service`), `fundacao-sidebar-e-shell` (shell/design system), `fundacao-admin-roles-usuarios` (existência da role `societario` no banco, usada só para exibição de sidebar — o acesso de dado depende de `user_type`).
- **Novo**: `src/app/(dashboard)/societario/{acordo,enquadramento,faturamento,decisoes}/page.tsx`, `src/components/societario/{profit-split-form,capital-contribution-form,legal-status-form,migration-trigger-panel,revenue-snapshot-form,decision-log-form}.tsx`.
- **Domínio de gestão**: Societário/Governança — última fase deste roadmap de 4 fases.
- **Dependência de `camu-docs`**: direta — a UI reproduz a estrutura e o vocabulário de `01-visao-geral/sociedade-e-divisao.md`, `03-financeiro/tipo-pj-mei-vs-me.md` e `05-decisoes/log-decisoes.md`; recomenda-se, após este change entrar em uso, que o `camu-docs` passe a referenciar o painel como fonte do estado atual, mantendo o markdown como registro de raciocínio histórico.
- Com este change, o painel cobre as 4 fases planejadas (Precificação, Catálogo, Estoque, Societário/Governança) além da Fundação já entregue — fechando o escopo da primeira versão 100% funcional do `camu-web-admin`.
