## 1. Sub-navegação da área Produção (UI)

- [ ] 1.1 Adicionar sub-navegação (abas/menu) dentro de `(dashboard)/producao` alternando entre Catálogo e Estoque
- [ ] 1.2 Adicionar as sub-rotas `producao/estoque/insumos` e `producao/estoque/pecas` ao registro interno de navegação da área

## 2. Estoque de insumos (UI)

- [ ] 2.1 Criar `src/app/(dashboard)/producao/estoque/insumos/page.tsx` com listagem (saldo, custo de referência, indicador de estoque baixo)
- [ ] 2.2 Criar `src/components/estoque/material-form.tsx` (cadastro/edição de insumo)
- [ ] 2.3 Criar `src/components/estoque/material-movement-form.tsx` (compra, consumo em produção com campo opcional de peça produzida, perda/refugo, ajuste manual)
- [ ] 2.4 Criar `src/components/estoque/material-threshold-form.tsx` (configuração de limite mínimo no detalhe do insumo)
- [ ] 2.5 Implementar filtro "estoque baixo" na listagem

## 3. Estoque de peças prontas (UI)

- [ ] 3.1 Criar `src/app/(dashboard)/producao/estoque/pecas/page.tsx` com listagem (peça, saldo disponível)
- [ ] 3.2 Criar `src/components/estoque/product-movement-form.tsx` (produção, venda, perda, ajuste manual)

## 4. Indicador de estoque baixo (UI)

- [ ] 4.1 Criar `src/components/estoque/low-stock-badge.tsx` e integrar ao componente de topbar existente
- [ ] 4.2 Implementar navegação do badge para a listagem de insumos filtrada por estoque baixo
- [ ] 4.3 Restringir a exibição do badge por `user_type`/role conforme `design.md`

## 5. Verificação

- [ ] 5.1 Testar manualmente como usuário `producao`: registrar consumo de insumo com peça produzida no mesmo formulário e confirmar as duas movimentações vinculadas
- [ ] 5.2 Testar manualmente: configurar limite mínimo, reduzir saldo abaixo dele e confirmar que o badge da topbar aparece com a contagem correta
- [ ] 5.3 Testar manualmente: registrar um ajuste manual como forma de corrigir um lançamento incorreto, confirmando que a movimentação original permanece inalterada no histórico
- [ ] 5.4 Testar manualmente como usuário `financeiro`: acessar as duas telas de estoque em modo leitura, sem badge de estoque baixo e sem ações de movimentação
- [ ] 5.5 Testar manualmente como usuário `marketplace-vendas`: confirmar que `producao/estoque/**` não é acessível e o badge não aparece
