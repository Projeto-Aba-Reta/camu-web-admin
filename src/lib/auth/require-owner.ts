import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

// Server Actions são endpoints independentes da página — o guard do layout
// (`admin/layout.tsx`) não os protege se forem invocados diretamente. Toda
// action de gestao-de-roles/gestao-de-usuarios deve chamar isto primeiro.
export async function requireOwner(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || currentUser.userType !== "owner") {
    throw new Error("Apenas Owners podem realizar esta ação.");
  }
  return currentUser;
}
