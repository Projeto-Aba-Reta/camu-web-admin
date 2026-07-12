import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canAccessPrintQueue } from "@/lib/auth/print-queue-access";

export default async function FilaDeImpressaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // producao/layout.tsx já garante acesso ao domínio Produção/Catálogo.
  // Fila de impressão tem regra mais restrita — apenas Owner/Sócio/
  // producao/financeiro (ver migration fila_de_impressao) — por isso este
  // guard aninhado, mesmo padrão de producao/estoque/layout.tsx.
  if (!currentUser || !canAccessPrintQueue(currentUser)) {
    redirect("/producao/catalogo");
  }

  return <>{children}</>;
}
