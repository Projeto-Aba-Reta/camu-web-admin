import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

function isSocioOrOwner(user: CurrentUser): boolean {
  return user.userType === "owner" || user.userType === "socio";
}

// Leitura + execução de cálculo: Owner/Sócio ou role financeiro/producao
// (ver migration precificacao_parametros_e_motor, policies de select/insert
// em price_calculations).
export function canAccessPrecificacao(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "financeiro") || hasRole(user, "producao");
}

// Escrita de parâmetros de custo, taxas de canal e faixas de porte: Owner/Sócio
// ou role financeiro (mesma regra das policies de insert dessas tabelas).
export function canWriteFinanceiroParams(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "financeiro");
}

// Cadastro/atualização de impressoras: Owner/Sócio ou role producao (parque
// físico é decisão operacional, não financeira — mesma regra da policy de
// insert/update de printers).
export function canWritePrinters(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "producao");
}

// Server Actions são endpoints independentes da página — o guard do layout
// (`financeiro/layout.tsx`) não os protege se forem invocados diretamente.
export async function requirePrecificacaoAccess(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canAccessPrecificacao(currentUser)) {
    throw new Error("Você não tem acesso à área de Precificação.");
  }
  return currentUser;
}

export async function requireFinanceiroWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWriteFinanceiroParams(currentUser)) {
    throw new Error("Apenas Owner, Sócio ou Financeiro podem alterar estes parâmetros.");
  }
  return currentUser;
}

export async function requirePrinterWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWritePrinters(currentUser)) {
    throw new Error("Apenas Owner, Sócio ou Produção podem alterar o parque de impressoras.");
  }
  return currentUser;
}
