import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canUpdateCustomerStatus } from "@/lib/auth/sales-access";
import { visibleSalesTabs } from "@/lib/auth/sales-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { VendasNav } from "@/components/vendas/vendas-nav";
import { PetMiniatureView } from "@/components/producao/pet-miniature-view";
import type { PetMiniatureBoardItem } from "@/components/producao/pet-miniature-board";

export default async function MiniaturasPetPage() {
  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  // Junta as duas tabelas que alimentam esse fluxo: pet_miniature_requests
  // (fotos, prévia por IA, status pré-pagamento) e orders (pedido gerado na
  // aprovação, com o mesmo eixo logístico da loja do site). Nenhuma tela do
  // admin lia pet_miniature_requests até agora — isto é a fila de produção e
  // o painel comercial desse fluxo, lado a lado.
  const [requests, orders] = await Promise.all([
    repositories.petMiniatureRequests.listAll(),
    repositories.salesOrders.list(),
  ]);

  const orderById = new Map(orders.map((order) => [order.id, order]));

  const items: PetMiniatureBoardItem[] = requests.map((request) => ({
    request,
    order: request.orderId ? (orderById.get(request.orderId) ?? null) : null,
  }));

  const canWrite = Boolean(currentUser && canUpdateCustomerStatus(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Miniaturas de pet"
        description="Encomendas do fluxo /miniatura-pet do site, da geração da prévia por IA até a entrega — uma linha por pet, com o pedido vinculado assim que o cliente aprova e paga."
      />

      <VendasNav activeTab="miniaturas" visibleTabs={visibleSalesTabs(currentUser)} />

      <PetMiniatureView items={items} canWrite={canWrite} />
    </div>
  );
}
