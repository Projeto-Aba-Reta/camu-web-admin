import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

// Espelha public.can_edit_storefront() da migration vitrine_v2.
export function canEditStorefront(user: CurrentUser): boolean {
  return (
    user.userType === "owner" ||
    user.userType === "socio" ||
    hasRole(user, "producao") ||
    hasRole(user, "marketing") ||
    hasRole(user, "site")
  );
}

// Server Actions são endpoints independentes do layout — guard próprio.
export async function requireStorefrontEdit(): Promise<CurrentUser> {
  const user = await getCurrentProfile();
  if (!user || !canEditStorefront(user)) {
    throw new Error("Apenas Owner, Sócio, Produção, Marketing ou Site podem editar a vitrine.");
  }
  return user;
}
