import { canConfigureSales, canReadSalesResult } from "@/lib/auth/sales-access";
import type { VendasTab } from "@/components/vendas/vendas-nav";
import type { CurrentUser } from "@/types/auth";

// Abas que o perfil pode abrir. Pedidos e Funil valem para todo mundo que
// entrou na área (o layout já barrou o resto); Resultado e Configurações são
// mais restritas — ver Requirement "Abas da área Vendas".
//
// Cada página revalida a sua permissão por conta própria: esconder a aba é
// conveniência, não proteção.
export function visibleSalesTabs(user: CurrentUser | null): VendasTab[] {
  const tabs: VendasTab[] = ["pedidos", "funil"];
  if (!user) return tabs;
  if (canReadSalesResult(user)) tabs.push("resultado");
  if (canConfigureSales(user)) tabs.push("configuracoes");
  return tabs;
}
