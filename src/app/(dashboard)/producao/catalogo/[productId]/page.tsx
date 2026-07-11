import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canManageChannelListings, canWriteCatalog } from "@/lib/auth/catalog-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/catalogo/product-form";
import { MediaManager } from "@/components/catalogo/media-manager";
import { ChannelListingForm } from "@/components/catalogo/channel-listing-form";
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

  const [media, channelListings, linkedCalculation, printers, recentCalculations, allPrinters] = await Promise.all([
    repositories.productMedia.findByProductId(productId),
    repositories.productChannelListings.findByProductId(productId),
    product.priceCalculationId ? repositories.priceCalculations.findById(product.priceCalculationId) : null,
    repositories.printers.findActive(),
    repositories.priceCalculations.findRecent(200),
    repositories.printers.findAll(),
  ]);

  const printerNameById = new Map(allPrinters.map((printer) => [printer.id, printer.name]));
  const recentCalculationRows: HistoricoRow[] = recentCalculations.map((calculation) => ({
    ...calculation,
    printerName: printerNameById.get(calculation.printerId) ?? "—",
  }));

  const canWrite = Boolean(currentUser && canWriteCatalog(currentUser));
  const canManageChannels = Boolean(currentUser && canManageChannelListings(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader title={product.name} description="Cadastro, precificação, fotos e disponibilidade por canal desta peça." />

      <ProductForm
        product={product}
        printers={printers}
        recentCalculations={recentCalculationRows}
        initialLinkedCalculation={linkedCalculation}
        canWrite={canWrite}
      />

      <MediaManager productId={product.id} initialMedia={media} canWrite={canWrite} />

      <ChannelListingForm
        productId={product.id}
        channelListings={channelListings}
        linkedCalculation={linkedCalculation}
        canWrite={canManageChannels}
      />
    </div>
  );
}
