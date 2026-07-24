import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteOrderCost, canWriteSalesOrder } from "@/lib/auth/sales-access";
import { SalesService } from "@/lib/services/sales-service";
import { SalesPipelineService } from "@/lib/services/sales-pipeline-service";
import { PageHeader } from "@/components/layout/page-header";
import { SalesOrderDetail } from "@/components/vendas/sales-order-detail";
import { SalesOrderForm } from "@/components/vendas/sales-order-form";

interface PedidoDetalhePageProps {
  params: Promise<{ orderId: string }>;
}

export default async function PedidoDetalhePage({ params }: PedidoDetalhePageProps) {
  const { orderId } = await params;

  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const service = new SalesService(repositories);
  const pipeline = new SalesPipelineService(repositories);

  const order = await service.findById(orderId);
  if (!order) notFound();

  const [origins, stages, printers, profiles, costs, events, products] = await Promise.all([
    service.listOrigins(),
    pipeline.listStages(),
    repositories.printers.findAll(),
    repositories.users.listAll(),
    service.listCosts(order.id),
    pipeline.listStageEvents(order.id),
    repositories.products.findAll(),
  ]);

  const canWrite = Boolean(currentUser && canWriteSalesOrder(currentUser));
  const canWriteCost = Boolean(currentUser && canWriteOrderCost(currentUser));

  return (
    <div className="space-y-6">
      <Link
        href="/vendas/pedidos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para os pedidos
      </Link>

      <PageHeader
        title={`Pedido ${order.orderCode}`}
        description={order.customerName ?? undefined}
        action={
          canWrite && (
            <SalesOrderForm
              origins={origins.filter((origin) => origin.isActive)}
              stages={stages.filter((stage) => stage.isActive)}
              products={products}
              profiles={profiles}
              order={order}
            />
          )
        }
      />

      <SalesOrderDetail
        order={order}
        origins={origins}
        stages={stages}
        printers={printers}
        profiles={profiles}
        costs={costs}
        events={events}
        canWriteCost={canWriteCost}
      />
    </div>
  );
}
