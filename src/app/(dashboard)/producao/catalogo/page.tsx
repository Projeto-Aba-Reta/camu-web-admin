import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteCatalog } from "@/lib/auth/catalog-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProducaoNav } from "@/components/producao/producao-nav";
import { Button } from "@/components/ui/button";
import { CatalogMaturityIndicator } from "@/components/catalogo/catalog-maturity-indicator";
import { ProductList } from "@/components/catalogo/product-list";
import { CatalogService } from "@/lib/services/catalog-service";
import type { ProductCategory } from "@/types/catalog";

export default async function CatalogoPage() {
  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const catalogService = new CatalogService(repositories);

  const [products, tiers, publishedOnStoreIds] = await Promise.all([
    repositories.products.findAll(),
    repositories.sizeTiers.findAll(),
    catalogService.listProductIdsPublishedOnStore(),
  ]);
  const canWrite = Boolean(currentUser && canWriteCatalog(currentUser));

  const activeCountByCategory = products.reduce<Partial<Record<ProductCategory, number>>>((acc, product) => {
    if (product.status === "ativo") {
      acc[product.category] = (acc[product.category] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo"
        description="Peças do catálogo autoral: cadastro, precificação vinculada, fotos e disponibilidade por canal."
        action={
          canWrite && (
            <Button asChild size="sm">
              <Link href="/producao/catalogo/novo">Nova peça</Link>
            </Button>
          )
        }
      />

      <ProducaoNav />

      <CatalogMaturityIndicator activeCountByCategory={activeCountByCategory} />

      <ProductList
        products={products}
        tiers={tiers}
        publishedOnStoreIds={publishedOnStoreIds}
        canWrite={canWrite}
      />
    </div>
  );
}
