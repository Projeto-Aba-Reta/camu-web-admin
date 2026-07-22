import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canManageChannelListings, canWriteCatalog } from "@/lib/auth/catalog-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/catalogo/product-form";
import { MediaManager } from "@/components/catalogo/media-manager";
import { ChannelListingForm } from "@/components/catalogo/channel-listing-form";
import { SlicingSheetSection } from "@/components/catalogo/slicing-sheet-section";
import { ProductComponentsManager } from "@/components/catalogo/product-components-manager";
import { ProductPartsManager } from "@/components/catalogo/product-parts-manager";
import { ProductDetailActions } from "@/components/catalogo/product-detail-actions";
import { SlicingSheetService } from "@/lib/services/slicing-sheet-service";
import type { HistoricoRow } from "@/components/precificacao/historico-tabela";

interface ProductPageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { productId } = await params;
  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const product = await repositories.products.findById(productId);
  if (!product) notFound();

  const [media, channelListings, linkedCalculation, printers, recentCalculations, allPrinters, materials, allProducts, components, parts, tiers] =
    await Promise.all([
      repositories.productMedia.findByProductId(productId),
      repositories.productChannelListings.findByProductId(productId),
      product.priceCalculationId ? repositories.priceCalculations.findById(product.priceCalculationId) : null,
      repositories.printers.findActive(),
      repositories.priceCalculations.findRecent(200),
      repositories.printers.findAll(),
      repositories.materials.findAll(),
      repositories.products.findAll(),
      repositories.productComponents.findByParentId(productId),
      repositories.productParts.findByProductId(productId),
      repositories.sizeTiers.findAll(),
    ]);

  const slicingSheetService = new SlicingSheetService(repositories);
  const slicingSheetRows = await slicingSheetService.listByProduct(productId);
  const filamentMaterials = materials.filter((material) => material.type === "filamento");

  const printerNameById = new Map(allPrinters.map((printer) => [printer.id, printer.name]));
  const recentCalculationRows: HistoricoRow[] = recentCalculations.map((calculation) => ({
    ...calculation,
    printerName: (calculation.printerId && printerNameById.get(calculation.printerId)) || "—",
  }));

  const canWrite = Boolean(currentUser && canWriteCatalog(currentUser));
  const canManageChannels = Boolean(currentUser && canManageChannelListings(currentUser));
  const candidateComponents = allProducts
    .filter((candidate) => candidate.productType === "simples" && candidate.id !== product.id)
    .map((candidate) => ({ id: candidate.id, name: candidate.name, hasKnownCost: Boolean(candidate.priceCalculationId) }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description="Cadastro, precificação, fotos e disponibilidade por canal desta peça."
        action={canWrite && <ProductDetailActions product={product} />}
      />

      <ProductForm
        product={product}
        printers={printers}
        recentCalculations={recentCalculationRows}
        initialLinkedCalculation={linkedCalculation}
        tiers={tiers}
        canWrite={canWrite}
      />

      {product.productType === "composta" && (
        <>
          <ProductPartsManager
            productId={product.id}
            initialParts={parts}
            printers={printers}
            filamentMaterials={filamentMaterials}
            canWrite={canWrite}
          />
          <ProductComponentsManager
            parentProductId={product.id}
            initialComponents={components}
            initialPartsCount={parts.length}
            candidateProducts={candidateComponents}
            tiers={tiers}
            canWrite={canWrite}
          />
        </>
      )}

      <MediaManager productId={product.id} initialMedia={media} canWrite={canWrite} />

      <SlicingSheetSection
        productId={product.id}
        rows={slicingSheetRows}
        printers={printers}
        materials={filamentMaterials}
        canWrite={canWrite}
      />

      <ChannelListingForm
        productId={product.id}
        channelListings={channelListings}
        linkedCalculation={linkedCalculation}
        canWrite={canManageChannels}
      />
    </div>
  );
}
