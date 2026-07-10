## 1. Registro de rota de área (backend/dados)

- [ ] 1.1 Adicionar entrada `societario -> /societario/acordo` no registro de rotas de área consumido por `navegacao-por-area`
- [ ] 1.2 Implementar guard de rota em `(dashboard)/societario/**` verificando `user_type in ('owner','socio')` (não apenas a role `societario`)

## 2. Tela de acordo de sociedade (UI)

- [ ] 2.1 Criar `src/app/(dashboard)/societario/acordo/page.tsx`
- [ ] 2.2 Criar `src/components/societario/profit-split-form.tsx` (regra vigente + histórico)
- [ ] 2.3 Criar `src/components/societario/capital-contribution-form.tsx` (listagem agrupada por sócio + registro de novo aporte)

## 3. Tela de enquadramento jurídico (UI)

- [ ] 3.1 Criar `src/app/(dashboard)/societario/enquadramento/page.tsx`
- [ ] 3.2 Criar `src/components/societario/legal-status-form.tsx` (enquadramento vigente + histórico + registro de migração)
- [ ] 3.3 Criar `src/components/societario/migration-trigger-panel.tsx` (4 cards de status, ação de marcar/reverter com nota)

## 4. Tela de faturamento x teto (UI)

- [ ] 4.1 Criar `src/app/(dashboard)/societario/faturamento/page.tsx`
- [ ] 4.2 Criar componente de indicador de percentual do teto com destaque acima de 80%
- [ ] 4.3 Criar `src/components/societario/revenue-snapshot-form.tsx` (tabela de lançamentos mensais com destaque de mês faltante + registro de novo lançamento)

## 5. Tela de log de decisões (UI)

- [ ] 5.1 Criar `src/app/(dashboard)/societario/decisoes/page.tsx` com layout de timeline
- [ ] 5.2 Criar `src/components/societario/decision-log-form.tsx` (registro de nova entrada, sem edição)

## 6. Verificação

- [ ] 6.1 Testar manualmente como Sócio: atualizar a regra de divisão de lucro e confirmar que o histórico mostra a versão anterior
- [ ] 6.2 Testar manualmente: marcar um gatilho como atingido, depois reverter sem nota (deve bloquear) e com nota (deve reverter)
- [ ] 6.3 Testar manualmente: lançar faturamento de um mês, deixar um mês anterior sem lançamento e confirmar o destaque de mês faltante na tabela
- [ ] 6.4 Testar manualmente: registrar uma nova entrada do log de decisões e confirmar que ela aparece no topo da timeline, sem opção de editar entradas antigas
- [ ] 6.5 Testar manualmente como usuário `member` com a role `societario` atribuída (via seed/admin): confirmar que `/societario/**` continua inacessível, validando que o acesso depende do `user_type`
