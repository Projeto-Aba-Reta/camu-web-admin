## 1. Infra e rota de área (backend/dados)

- [ ] 1.1 Criar bucket de Supabase Storage para fotos de peça, com policy de escrita equivalente à de `product_media` (`producao`/Owner/Sócio) e leitura pública ou assinada conforme necessidade do catálogo
- [ ] 1.2 Adicionar entrada `producao -> /producao/catalogo` no registro de rotas de área consumido por `navegacao-por-area`
- [ ] 1.3 Criar Server Action para gerar URL assinada de upload ao bucket

## 2. Listagem do catálogo (UI)

- [ ] 2.1 Criar `src/app/(dashboard)/producao/catalogo/page.tsx` com TanStack Table, filtros por categoria/porte/status
- [ ] 2.2 Criar componente de indicador de maturidade por categoria (constante `CATALOG_MATURITY_TARGET = 20`)

## 3. Cadastro e edição de peça (UI)

- [ ] 3.1 Criar `src/app/(dashboard)/producao/catalogo/novo/page.tsx` e `[productId]/page.tsx`
- [ ] 3.2 Criar `src/components/catalogo/product-form.tsx` (nome, descrição, categoria, porte, status)
- [ ] 3.3 Promover/reaproveitar `resultado-calculo.tsx` de `precificacao-telas` como componente compartilhado
- [ ] 3.4 Implementar seção de precificação no formulário: busca de cálculo existente (autocomplete) e cálculo inline (reaproveitando `calculo-form.tsx`)
- [ ] 3.5 Implementar Server Action de criar/editar peça via `catalog-service`, incluindo vínculo/troca de `price_calculation_id`

## 4. Gestão de mídia (UI)

- [ ] 4.1 Criar `src/components/catalogo/media-manager.tsx`: upload (via URL assinada), preview, remoção
- [ ] 4.2 Implementar reordenação por drag-and-drop com persistência em lote de `display_order`
- [ ] 4.3 Implementar definição de capa (desmarcando a anterior)

## 5. Disponibilidade por canal (UI)

- [ ] 5.1 Criar `src/components/catalogo/channel-listing-form.tsx`: ativação/desativação por canal, preço pré-preenchido pelo cálculo vinculado
- [ ] 5.2 Implementar validação client-side + Server Action exigindo motivo quando o preço divergir do sugerido

## 6. Verificação

- [ ] 6.1 Testar manualmente como usuário `producao`: cadastrar peça nova calculando o preço inline, sem sair da tela
- [ ] 6.2 Testar manualmente: vincular peça a um cálculo já existente do histórico de precificação
- [ ] 6.3 Testar manualmente: upload, reordenação e troca de capa de fotos
- [ ] 6.4 Testar manualmente: ativar canal com preço divergente do sugerido sem motivo (deve bloquear) e com motivo (deve salvar)
- [ ] 6.5 Testar manualmente como usuário `financeiro`: acessar o catálogo em modo leitura, sem ações de criação/edição/mídia visíveis
- [ ] 6.6 Testar manualmente como usuário `marketplace-vendas`: ajustar disponibilidade por canal sem conseguir editar dados da peça ou mídia
