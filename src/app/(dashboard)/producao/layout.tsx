import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canAccessCatalog } from "@/lib/auth/catalog-access";

export default async function ProducaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // getCurrentProfile() já garante sessão válida (o layout do dashboard
  // redireciona para /login antes de chegar aqui); resta restringir por
  // acesso ao domínio Produção/Catálogo. Todas as rotas producao/** herdam
  // esse guard por estarem aninhadas sob este layout.
  if (!currentUser || !canAccessCatalog(currentUser)) {
    redirect("/");
  }

  return <>{children}</>;
}
