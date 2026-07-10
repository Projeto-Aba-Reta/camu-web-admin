import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

// Server Actions são endpoints independentes da página — o guard do layout
// (`societario/layout.tsx`) não os protege se forem invocados diretamente.
// Acesso depende do user_type, nunca da role `societario` (ver design.md de
// societario-telas): um member com a role atribuída continua bloqueado.
export async function requireSocioOrOwner(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || (currentUser.userType !== "owner" && currentUser.userType !== "socio")) {
    throw new Error("Apenas Owner ou Sócio podem realizar esta ação.");
  }
  return currentUser;
}
