import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canAccessMarketingCalendar } from "@/lib/auth/marketing-calendar-access";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // getCurrentProfile() já garante sessão válida (o layout do dashboard
  // redireciona para /login antes de chegar aqui); resta restringir por
  // acesso ao domínio Marketplace/Vendas — Owner/Sócio ou role
  // marketplace-vendas, mesma regra das policies das tabelas.
  if (!currentUser || !canAccessMarketingCalendar(currentUser)) {
    redirect("/");
  }

  return <>{children}</>;
}
