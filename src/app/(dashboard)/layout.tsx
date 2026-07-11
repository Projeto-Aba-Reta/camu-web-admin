import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { buildSidebar } from "@/lib/navigation/build-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LowStockBadge } from "@/components/estoque/low-stock-badge";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    redirect("/login");
  }

  // Rede de segurança: um usuário só deveria chegar aqui com status
  // "invited" se pulasse o fluxo normal de /auth/confirm → /set-password
  // (ex.: sessão de convite antiga reaproveitada). Sem senha definida, ele
  // não conseguiria logar de novo caso saísse, então força a conclusão do
  // cadastro antes de liberar o dashboard.
  if (currentUser.status === "invited") {
    redirect("/set-password");
  }

  const cookieStore = await cookies();
  const rawScope = cookieStore.get("camu_sidebar_scope")?.value;
  const scope: "own" | "all" =
    rawScope === "all" && currentUser.userType === "socio" ? "all" : "own";

  const supabase = await createClient();
  const { roles: roleRepo } = createRepositories(supabase);
  const allRoles = await roleRepo.findAll();

  const sections = buildSidebar(currentUser, scope, allRoles);

  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar
        sections={sections}
        userType={currentUser.userType}
        isAllScope={scope === "all"}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          user={{ email: currentUser.email, fullName: currentUser.fullName }}
          lowStockBadge={<LowStockBadge />}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
