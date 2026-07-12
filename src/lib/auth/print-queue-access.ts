import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

function isSocioOrOwner(user: CurrentUser): boolean {
  return user.userType === "owner" || user.userType === "socio";
}

// Leitura da fila: Owner/Sócio ou role producao/financeiro (ver migration
// fila_de_impressao, policy de select em print_queue_items — ver
// Requirement "Acesso à fila de impressão").
export function canAccessPrintQueue(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao") || hasRole(user, "financeiro");
}

// Escrita (adicionar, iniciar, concluir, cancelar): Owner/Sócio ou role
// producao — mesma regra das policies de insert/update.
export function canWritePrintQueue(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao");
}

// Server Actions são endpoints independentes da página — o guard do layout
// não os protege se forem invocados diretamente.
export async function requirePrintQueueAccess(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canAccessPrintQueue(currentUser)) {
    throw new Error("Você não tem acesso à fila de impressão.");
  }
  return currentUser;
}

export async function requirePrintQueueWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWritePrintQueue(currentUser)) {
    throw new Error("Apenas Owner, Sócio ou Produção podem alterar a fila de impressão.");
  }
  return currentUser;
}
