import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteCatalog } from "@/lib/auth/catalog-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/catalogo/product-form";
import type { HistoricoRow } from "@/components/precificacao/historico-tabela";

export default async function NovaPecaPage() {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWriteCatalog(currentUser)) {
    redirect("/producao/catalogo");
  }

  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const [printers, calculations, allPrinters] = await Promise.all([
    repositories.printers.findActive(),
    repositories.priceCalculations.findRecent(200),
    repositories.printers.findAll(),
  ]);

  const printerNameById = new Map(allPrinters.map((printer) => [printer.id, printer.name]));
  const recentCalculations: HistoricoRow[] = calculations.map((calculation) => ({
    ...calculation,
    printerName: printerNameById.get(calculation.printerId) ?? "—",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova peça"
        description="Cadastre a peça e vincule um cálculo de preço já existente ou calcule um novo sem sair desta tela."
      />

      <ProductForm
        printers={printers}
        recentCalculations={recentCalculations}
        initialLinkedCalculation={null}
        canWrite
      />
    </div>
  );
}
