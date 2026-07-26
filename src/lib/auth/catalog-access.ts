import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

function isSocioOrOwner(user: CurrentUser): boolean {
  return user.userType === "owner" || user.userType === "socio";
}

// Leitura da listagem/detalhe de peça: Owner/Sócio ou role producao/
// precificacao/marketing (ver Requirement "Acesso conforme regra de domínio
// do catálogo").
export function canAccessCatalog(user: CurrentUser): boolean {
  return (
    isSocioOrOwner(user) ||
    hasRole(user, "producao") ||
    hasRole(user, "precificacao") ||
    hasRole(user, "marketing")
  );
}

// Criação/edição de peça e gestão de mídia: Owner/Sócio ou role producao
// (ver Requirement "Acesso de gestão de mídia restrito a Produção").
export function canWriteCatalog(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao");
}

// Ativação/desativação e ajuste de preço por canal: Owner/Sócio ou role
// producao/marketing (ver Requirement "Acesso de gestão de disponibilidade
// por Produção e Marketing").
export function canManageChannelListings(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao") || hasRole(user, "marketing");
}

// Server Actions são endpoints independentes da página — o guard do layout
// (`producao/layout.tsx`) não os protege se forem invocados diretamente.
export async function requireCatalogAccess(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canAccessCatalog(currentUser)) {
    throw new Error("Você não tem acesso à área de Catálogo.");
  }
  return currentUser;
}

export async function requireCatalogWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWriteCatalog(currentUser)) {
    throw new Error("Apenas Owner, Sócio ou Produção podem alterar peças e mídia do catálogo.");
  }
  return currentUser;
}

export async function requireChannelListingWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canManageChannelListings(currentUser)) {
    throw new Error("Apenas Owner, Sócio, Produção ou Marketing podem alterar disponibilidade por canal.");
  }
  return currentUser;
}
