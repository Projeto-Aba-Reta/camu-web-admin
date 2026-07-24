import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canAccessSales } from "@/lib/auth/sales-access";

export default async function VendasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // getCurrentProfile() já garante sessão válida (o layout do dashboard
  // redireciona para /login antes de chegar aqui); resta restringir por
  // acesso ao domínio Vendas — Owner/Sócio ou role vendas/financeiro/
  // producao, mesma regra das policies de orders.
  //
  // As abas Resultado e Configurações são mais restritas que a área e
  // revalidam a permissão na própria página.
  if (!currentUser || !canAccessSales(currentUser)) {
    redirect("/");
  }

  return <>{children}</>;
}
