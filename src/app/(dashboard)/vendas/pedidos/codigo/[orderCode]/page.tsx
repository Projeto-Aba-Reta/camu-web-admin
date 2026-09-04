import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";

interface PedidoPorCodigoPageProps {
  params: Promise<{ orderCode: string }>;
}

// Deep-link estável usado pela notificação de venda da loja própria
// (camu-web-landing-page, proposta irmã deep-link-admin-no-pedido) — a
// landing só conhece o order_code, não o uuid do pedido. O gate de acesso é
// o mesmo do detalhe: o layout de /vendas já exige canAccessSales.
export default async function PedidoPorCodigoPage({ params }: PedidoPorCodigoPageProps) {
  const { orderCode } = await params;

  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const orderId = await repositories.salesOrders.findIdByCode(orderCode);
  if (!orderId) notFound();

  redirect(`/vendas/pedidos/${orderId}`);
}
