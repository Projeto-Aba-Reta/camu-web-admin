export interface AreaRoute {
  href: string;
}

// Static registry: role slug → implemented route.
// Each domain phase adds its entry here when publishing its page.
// If a slug has no entry, the sidebar item renders as non-clickable.
export const areaRoutes: Record<string, AreaRoute> = {
  // Precificação (ver precificacao-telas): cálculo de preço é a página
  // padrão da área; configuração e histórico ficam em sub-rotas acessadas
  // por link dentro da própria área, não como itens de sidebar (design.md,
  // decisão 4).
  financeiro: { href: "/precificacao/calcular" },
  // Catálogo (ver catalogo-telas): listagem de peças é a página padrão da
  // área de Produção.
  producao: { href: "/producao/catalogo" },
  societario: { href: "/societario/acordo" },
  // Marketing: o calendário de redes sociais é, por ora, a única tela da
  // área e portanto sua página padrão.
  marketing: { href: "/marketing/calendario" },
  // Vendas (ver tela-de-vendas): a listagem de pedidos é a página padrão da
  // área; funil, resultado e configurações são abas com rota própria,
  // acessadas de dentro da área e não como itens de sidebar. Esta entrada é
  // o que tira a role `vendas` do estado de reserva não-clicável.
  vendas: { href: "/vendas/pedidos" },
};
