## 1. Registro de rota de área (backend/dados)

- [x] 1.1 Adicionar entrada `financeiro -> /financeiro/precificacao/calcular` no registro de rotas de área consumido por `navegacao-por-area`
- [x] 1.2 Confirmar que os guards de rota usam `has_role('financeiro')`/`has_role('producao')` (via funções já criadas em `fundacao-schema-auth`) para proteger `(dashboard)/financeiro/**`

## 2. Tela de configuração (UI)

- [x] 2.1 Criar `src/app/(dashboard)/financeiro/precificacao/configuracao/page.tsx`
- [x] 2.2 Criar `src/components/precificacao/parametros-form.tsx` (parâmetros de custo: filamento, energia, consumo, reserva, embalagem) com histórico inline
- [x] 2.3 Criar `src/components/precificacao/impressora-form.tsx` (cadastro/atualização de impressoras, toggle ativo/inativo) com histórico inline
- [x] 2.4 Criar `src/components/precificacao/canal-fee-form.tsx` (taxas por canal) com histórico inline
- [x] 2.5 Criar `src/components/precificacao/size-tier-form.tsx` (faixas de porte P/M/G) com histórico inline
- [x] 2.6 Implementar desabilitação condicional dos formulários conforme `user_type`/roles do usuário logado (Financeiro vs. Produção vs. sem acesso)

## 3. Tela de cálculo de preço (UI)

- [x] 3.1 Criar `src/app/(dashboard)/financeiro/precificacao/calcular/page.tsx`
- [x] 3.2 Criar `src/components/precificacao/calculo-form.tsx` (peso, tempo, seleção de impressora ativa)
- [x] 3.3 Criar `src/components/precificacao/resultado-calculo.tsx` (breakdown de custo, porte sugerido com tratamento de ambiguidade, tabela de preço/margem por canal)
- [x] 3.4 Implementar Server Action que chama `pricing-service.calculateAndSavePrice`, incluindo o porte escolhido manualmente quando houver ambiguidade

## 4. Histórico de cálculos (UI)

- [x] 4.1 Criar `src/app/(dashboard)/financeiro/precificacao/historico/page.tsx` com TanStack Table (filtro por período e por porte)
- [x] 4.2 Garantir que a listagem exibe o snapshot salvo (`cost_breakdown`/`channel_prices` do registro), nunca recalculado

## 5. Verificação

- [x] 5.1 Testar manualmente como Owner: atualizar um parâmetro de custo, confirmar que o histórico mostra o valor anterior e o novo
- [x] 5.2 Testar manualmente: executar um cálculo com peso/tempo que gera ambiguidade de porte e confirmar que a UI exige escolha manual antes de salvar
- [x] 5.3 Testar manualmente: executar um cálculo, depois alterar um parâmetro de custo, e confirmar que o histórico ainda mostra o resultado antigo sem alteração
- [x] 5.4 Testar manualmente como usuário com role `producao`: acessar a tela de cálculo normalmente, e confirmar que os formulários de parâmetros de custo/taxas de canal aparecem desabilitados na tela de configuração
- [x] 5.5 Testar manualmente como usuário sem role `financeiro`/`producao`: confirmar que `/financeiro/precificacao/**` não é acessível
