import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import type { CurrentUser } from "@/types/auth";

function hasRole(user: CurrentUser, slug: string): boolean {
  return user.roles.some((role) => role.slug === slug);
}

function isSocioOrOwner(user: CurrentUser): boolean {
  return user.userType === "owner" || user.userType === "socio";
}

// Leitura e escrita têm a mesma regra — Owner/Sócio ou role
// marketplace-vendas — espelhando as policies de
// commemorative_dates_marketing e social_content_plan_items (ver migration
// calendario_marketing_redes_sociais e Requirement "Acesso ao calendário de
// marketing"). Duas funções mesmo assim, para que a tela possa distinguir
// leitura de escrita se a regra divergir depois.
export function canAccessMarketingCalendar(user: CurrentUser): boolean {
  return isSocioOrOwner(user) || hasRole(user, "marketplace-vendas");
}

export function canWriteMarketingCalendar(user: CurrentUser): boolean {
  return canAccessMarketingCalendar(user);
}

// Server Actions são endpoints independentes da página — o guard do layout
// não as protege se forem invocadas diretamente.
export async function requireMarketingCalendarAccess(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canAccessMarketingCalendar(currentUser)) {
    throw new Error("Você não tem acesso ao calendário de marketing.");
  }
  return currentUser;
}

export async function requireMarketingCalendarWrite(): Promise<CurrentUser> {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWriteMarketingCalendar(currentUser)) {
    throw new Error("Apenas Owner, Sócio ou Vendas/Marketplace podem alterar o calendário de marketing.");
  }
  return currentUser;
}
