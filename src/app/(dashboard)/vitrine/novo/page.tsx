import { PageHeader } from "@/components/layout/page-header";
import { NewStoreProductForm } from "@/components/vitrine/new-store-product-form";

export default function NovoProdutoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo produto"
        description="Comece com nome e preço. Na próxima tela você adiciona fotos, descrição e publica."
      />
      <NewStoreProductForm />
    </div>
  );
}
