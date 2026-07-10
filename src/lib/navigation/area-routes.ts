export interface AreaRoute {
  href: string;
}

// Static registry: role slug → implemented route.
// Each domain phase adds its entry here when publishing its page.
// If a slug has no entry, the sidebar item renders as non-clickable.
export const areaRoutes: Record<string, AreaRoute> = {
  // example (uncomment when the financial domain page is built):
  // financeiro: { href: "/financeiro" },
  societario: { href: "/societario/acordo" },
};
