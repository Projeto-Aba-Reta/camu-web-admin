import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canAccessPrecificacao } from "@/lib/auth/pricing-access";

export default async function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // getCurrentProfile() já garante sessão válida (o layout do dashboard
  // redireciona para /login antes de chegar aqui); resta restringir por
  // acesso ao domínio Financeiro. Todas as rotas financeiro/** herdam esse
  // guard por estarem aninhadas sob este layout.
  if (!currentUser || !canAccessPrecificacao(currentUser)) {
    redirect("/");
  }

  return <>{children}</>;
}
