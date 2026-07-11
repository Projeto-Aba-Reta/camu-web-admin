import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { InventoryService } from "@/lib/services/inventory-service";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteInventory } from "@/lib/auth/inventory-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProducaoNav } from "@/components/producao/producao-nav";
import { MaterialForm } from "@/components/estoque/material-form";
import { MaterialList } from "@/components/estoque/material-list";

export default async function EstoqueInsumosPage() {
  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const inventoryService = new InventoryService(repositories);

  const [rows, printers, products] = await Promise.all([
    inventoryService.listMaterialsWithStatus(),
    repositories.printers.findActive(),
    repositories.products.findAll(),
  ]);

  const canWrite = Boolean(currentUser && canWriteInventory(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque de insumos"
        description="Saldo, custo de referência e alerta de estoque baixo por insumo. Movimentações e limites ficam registrados por insumo."
        action={canWrite && <MaterialForm />}
      />

      <ProducaoNav />

      <MaterialList rows={rows} printers={printers} products={products} canWrite={canWrite} />
    </div>
  );
}
