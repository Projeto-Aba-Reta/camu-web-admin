import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteInventory } from "@/lib/auth/inventory-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProducaoNav } from "@/components/producao/producao-nav";
import { ProductStockList, type ProductStockRow } from "@/components/estoque/product-stock-list";

export default async function EstoquePecasPage() {
  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const [products, balances] = await Promise.all([
    repositories.products.findAll(),
    repositories.productStockMovements.findAllBalances(),
  ]);

  const balanceByProductId = new Map(balances.map((balance) => [balance.productId, balance.balance]));
  const rows: ProductStockRow[] = products.map((product) => ({
    product,
    balance: balanceByProductId.get(product.id) ?? 0,
  }));

  const canWrite = Boolean(currentUser && canWriteInventory(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque de peças prontas"
        description="Saldo disponível por peça do catálogo, derivado das movimentações de produção, venda, perda e ajuste."
      />

      <ProducaoNav />

      <ProductStockList rows={rows} canWrite={canWrite} />
    </div>
  );
}
