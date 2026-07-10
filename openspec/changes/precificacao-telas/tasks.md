## 1. Registro de rota de área (backend/dados)

- [ ] 1.1 Adicionar entrada `financeiro -> /financeiro/precificacao/calcular` no registro de rotas de área consumido por `navegacao-por-area`
- [ ] 1.2 Confirmar que os guards de rota usam `has_role('financeiro')`/`has_role('producao')` (via funções já criadas em `fundacao-schema-auth`) para proteger `(dashboard)/financeiro/**`

## 2. Tela de configuração (UI)

- [ ] 2.1 Criar `src/app/(dashboard)/financeiro/precificacao/configuracao/page.tsx`
- [ ] 2.2 Criar `src/components/precificacao/parametros-form.tsx` (parâmetros de custo: filamento, energia, consumo, reserva, embalagem) com histórico inline
- [ ] 2.3 Criar `src/components/precificacao/impressora-form.tsx` (cadastro/atualização de impressoras, toggle ativo/inativo) com histórico inline
- [ ] 2.4 Criar `src/components/precificacao/canal-fee-form.tsx` (taxas por canal) com histórico inline
- [ ] 2.5 Criar `src/components/precificacao/size-tier-form.tsx` (faixas de porte P/M/G) com histórico inline
- [ ] 2.6 Implementar desabilitação condicional dos formulários conforme `user_type`/roles do usuário logado (Financeiro vs. Produção vs. sem acesso)

## 3. Tela de cálculo de preço (UI)

- [ ] 3.1 Criar `src/app/(dashboard)/financeiro/precificacao/calcular/page.tsx`
- [ ] 3.2 Criar `src/components/precificacao/calculo-form.tsx` (peso, tempo, seleção de impressora ativa)
- [ ] 3.3 Criar `src/components/precificacao/resultado-calculo.tsx` (breakdown de custo, porte sugerido com tratamento de ambiguidade, tabela de preço/margem por canal)
- [ ] 3.4 Implementar Server Action que chama `pricing-service.calculateAndSavePrice`, incluindo o porte escolhido manualmente quando houver ambiguidade

## 4. Histórico de cálculos (UI)

- [ ] 4.1 Criar `src/app/(dashboard)/financeiro/precificacao/historico/page.tsx` com TanStack Table (filtro por período e por porte)
- [ ] 4.2 Garantir que a listagem exibe o snapshot salvo (`cost_breakdown`/`channel_prices` do registro), nunca recalculado

## 5. Verificação

- [ ] 5.1 Testar manualmente como Owner: atualizar um parâmetro de custo, confirmar que o histórico mostra o valor anterior e o novo
- [ ] 5.2 Testar manualmente: executar um cálculo com peso/tempo que gera ambiguidade de porte e confirmar que a UI exige escolha manual antes de salvar
- [ ] 5.3 Testar manualmente: executar um cálculo, depois alterar um parâmetro de custo, e confirmar que o histórico ainda mostra o resultado antigo sem alteração
- [ ] 5.4 Testar manualmente como usuário com role `producao`: acessar a tela de cálculo normalmente, e confirmar que os formulários de parâmetros de custo/taxas de canal aparecem desabilitados na tela de configuração
- [ ] 5.5 Testar manualmente como usuário sem role `financeiro`/`producao`: confirmar que `/financeiro/precificacao/**` não é acessível
