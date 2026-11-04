import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { StoreProductEditor } from "@/components/vitrine/store-product-editor";
import { StoreService } from "@/lib/vitrine/store-service";
import { evaluateReadiness } from "@/lib/vitrine/types";

export default async function EditarProdutoPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const supabase = await createClient();
  const product = await new StoreService(supabase as never).get(productId);
  if (!product) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const readiness = evaluateReadiness({ ...product, mediaCount: product.media.length });

  return (
    <div className="space-y-6">
      <PageHeader title={product.title} description={`/loja/${product.slug}`} />
      <StoreProductEditor
        product={product}
        readiness={readiness}
        imageBaseUrl={`${baseUrl}/storage/v1/object/public/product-media`}
        siteUrl={process.env.NEXT_PUBLIC_STORE_URL ?? ""}
      />
    </div>
  );
}
