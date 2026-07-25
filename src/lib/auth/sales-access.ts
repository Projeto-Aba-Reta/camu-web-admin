import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

function isSocioOrOwner(user: CurrentUser): boolean {
  return user.userType === "owner" || user.userType === "socio";
}

// Espelha a matriz de acesso do design (decisão 8) e as policies da migration
// vendas_funil_e_resultado. Cada função corresponde a uma linha das
// Requirements "Acesso a ..." das specs da área.

// Entrar na área: quem vende, quem produz e quem cuida do dinheiro.
export function canAccessSales(user: CurrentUser): boolean {
  return (
    isSocioOrOwner(user) ||
    hasRole(user, "vendas") ||
    hasRole(user, "financeiro") ||
    hasRole(user, "producao")
  );
}

// Cadastrar, editar e excluir pedido é trabalho da área de Vendas.
export function canWriteSalesOrder(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "vendas");
}

// Mover no funil: produção entra porque o andamento da peça é dela.
export function canMoveSalesOrder(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "vendas") || hasRole(user, "producao");
}

// Lançar e conferir custo — quem lança precisa enxergar o que lançou, então
// leitura e escrita de custo têm a mesma regra.
export function canWriteOrderCost(user: CurrentUser): boolean {
  return (
    isSocioOrOwner(user) ||
    hasRole(user, "vendas") ||
    hasRole(user, "financeiro") ||
    hasRole(user, "producao")
  );
}

// A agregação do período é mais restrita que o custo por pedido: produção
// lança custo mas não vê o resultado do mês.
export function canReadSalesResult(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "vendas") || hasRole(user, "financeiro");
}

// Etapas do funil e origens de venda.
export function canConfigureSales(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "vendas");
}

// Server Actions são endpoints independentes da página — o guard do layout
// não as protege se forem invocadas diretamente.

async function requireWith(
  check: (user: CurrentUser) => boolean,
  message: string,
): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !check(currentUser)) {
    throw new Error(message);
  }
  return currentUser;
}

export function requireSalesAccess(): Promise<CurrentUser> {
  return requireWith(canAccessSales, "Você não tem acesso à área de Vendas.");
}

export function requireSalesOrderWrite(): Promise<CurrentUser> {
  return requireWith(
    canWriteSalesOrder,
    "Apenas Owner, Sócio ou Vendas podem cadastrar, editar ou excluir pedidos.",
  );
}

export function requireSalesOrderMove(): Promise<CurrentUser> {
  return requireWith(
    canMoveSalesOrder,
    "Apenas Owner, Sócio, Vendas ou Produção podem mover pedidos no funil.",
  );
}

export function requireOrderCostWrite(): Promise<CurrentUser> {
  return requireWith(
    canWriteOrderCost,
    "Apenas Owner, Sócio, Vendas, Financeiro ou Produção podem lançar custos.",
  );
}

export function requireSalesResultRead(): Promise<CurrentUser> {
  return requireWith(
    canReadSalesResult,
    "Apenas Owner, Sócio, Vendas ou Financeiro podem ver o resultado de vendas.",
  );
}

export function requireSalesConfigure(): Promise<CurrentUser> {
  return requireWith(
    canConfigureSales,
    "Apenas Owner, Sócio ou Vendas podem configurar etapas e origens.",
  );
}
