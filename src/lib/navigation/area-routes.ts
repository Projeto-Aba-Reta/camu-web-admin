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
  // decisão 4). Produção também usa a mesma entrada de sidebar para
  // executar cálculos, mesmo sem acesso à configuração de parâmetros.
  financeiro: { href: "/financeiro/precificacao/calcular" },
  producao: { href: "/financeiro/precificacao/calcular" },
};
