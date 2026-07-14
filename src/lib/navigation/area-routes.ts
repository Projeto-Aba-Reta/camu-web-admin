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
  financeiro: { href: "/financeiro/precificacao/calcular" },
  // Catálogo (ver catalogo-telas): listagem de peças é a página padrão da
  // área de Produção.
  producao: { href: "/producao/catalogo" },
  societario: { href: "/societario/acordo" },
  // Marketing: o calendário de redes sociais é, por ora, a única tela da
  // área e portanto sua página padrão.
  //
  // A role `vendas` (Vendas/Marketplace) não tem entrada aqui de propósito:
  // é reserva de nome, sem tela construída ainda, e a ausência de rota é o
  // que faz a sidebar renderizá-la como item não-clicável.
  marketing: { href: "/marketing/calendario" },
};
