import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StoreProductGrid } from "@/components/vitrine/store-product-grid";
import { StoreService } from "@/lib/vitrine/store-service";

export default async function VitrinePage() {
  const supabase = await createClient();
  const products = await new StoreService(supabase as never).list();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vitrine"
        description="Produtos que aparecem na loja do site. Cadastre com nome, preço e fotos — o resto é opcional."
        action={
          <Button asChild size="sm">
            <Link href="/vitrine/novo">Novo produto</Link>
          </Button>
        }
      />
      <StoreProductGrid
        products={products}
        imageBaseUrl={`${baseUrl}/storage/v1/object/public/product-media`}
        siteUrl={process.env.NEXT_PUBLIC_STORE_URL ?? ""}
      />
    </div>
  );
}
