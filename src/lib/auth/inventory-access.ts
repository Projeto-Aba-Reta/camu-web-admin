import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

function isSocioOrOwner(user: CurrentUser): boolean {
  return user.userType === "owner" || user.userType === "socio";
}

// Leitura de saldo/listagens de estoque: Owner/Sócio ou role producao/
// financeiro (ver migration estoque_insumos_e_pecas_prontas, policies de
// select). Não inclui marketplace-vendas — mais restrito que
// canAccessCatalog, por isso um guard próprio em vez de reaproveitar aquele.
export function canAccessInventory(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao") || hasRole(user, "financeiro");
}

// Registro de movimentação e configuração de limite: Owner/Sócio ou role
// producao (mesma regra das policies de insert/update). Também é o
// critério de visibilidade do badge de estoque baixo na topbar (ver
// Requirement "Indicador não visível a usuários sem acesso ao domínio de
// Produção" em indicador-de-estoque-baixo).
export function canWriteInventory(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao");
}

// Server Actions são endpoints independentes da página — o guard do layout
// (`producao/estoque/layout.tsx`) não os protege se forem invocados
// diretamente.
export async function requireInventoryAccess(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canAccessInventory(currentUser)) {
    throw new Error("Você não tem acesso à área de Estoque.");
  }
  return currentUser;
}

export async function requireInventoryWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWriteInventory(currentUser)) {
    throw new Error("Apenas Owner, Sócio ou Produção podem registrar movimentações de estoque.");
  }
  return currentUser;
}
