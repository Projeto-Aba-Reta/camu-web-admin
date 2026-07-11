import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canAccessInventory } from "@/lib/auth/inventory-access";

export default async function EstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // producao/layout.tsx já garante acesso ao domínio Produção/Catálogo, que
  // inclui marketplace-vendas. Estoque tem regra mais restrita — apenas
  // Owner/Sócio/producao/financeiro (ver migration
  // estoque_insumos_e_pecas_prontas) — por isso este guard aninhado.
  if (!currentUser || !canAccessInventory(currentUser)) {
    redirect("/producao/catalogo");
  }

  return <>{children}</>;
}
