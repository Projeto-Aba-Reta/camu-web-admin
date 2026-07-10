import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // getCurrentProfile() já garante sessão válida (o layout do dashboard
  // redireciona para /login antes de chegar aqui); resta restringir por
  // user_type. Todas as rotas admin/roles/** e admin/usuarios/** herdam
  // esse guard por estarem aninhadas sob este layout.
  if (!currentUser || currentUser.userType !== "owner") {
    redirect("/");
  }

  return <>{children}</>;
}
