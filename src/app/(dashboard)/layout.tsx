import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

// Shell mínimo pós-login — a sidebar completa é escopo de
// fundacao-sidebar-e-shell. Busca a sessão de novo no server como defesa em
// profundidade: o middleware já bloqueia a UX, mas RLS + este check são a
// fronteira de segurança real.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b border-charcoal/10 bg-white px-6 py-4">
        <span className="font-semibold text-charcoal">Camu Admin</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-charcoal/70">{currentUser.email}</span>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="text-coral hover:underline">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
