import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteOrderCost, canWriteSalesOrder } from "@/lib/auth/sales-access";
import { visibleSalesTabs } from "@/lib/auth/sales-tabs";
import { SalesService } from "@/lib/services/sales-service";
import { PageHeader } from "@/components/layout/page-header";
import { VendasNav } from "@/components/vendas/vendas-nav";
import { SalesOrderFilters } from "@/components/vendas/sales-order-filters";
import { SalesOrderTable } from "@/components/vendas/sales-order-table";
import { SalesOrderForm } from "@/components/vendas/sales-order-form";

interface PedidosPageProps {
  // Filtros viajam na URL para a visão ser compartilhável e sobreviver ao
  // refresh — mesmo padrão do calendário de marketing.
  searchParams: Promise<{
    de?: string;
    ate?: string;
    origem?: string;
    vendedor?: string;
    etapa?: string;
  }>;
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const { de, ate, origem, vendedor, etapa } = await searchParams;

  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const service = new SalesService(repositories);

  const [
    orders,
    origins,
    stages,
    products,
    sellerNames,
    costParameters,
    printers,
    channelFees,
    sizeTierRanges,
    sizeTiers,
  ] = await Promise.all([
    service.list({
      createdFrom: de,
      createdTo: ate,
      saleOriginId: origem,
      soldByName: vendedor,
      stageId: etapa,
    }),
    service.listOrigins(),
    repositories.orderPipelineStages.listAll(true),
    repositories.products.findAll(),
    // Nomes de todos os pedidos, não só dos filtrados: a sugestão tem que
    // continuar completa mesmo com a listagem recortada.
    service.listSellerNames(),
    // Parâmetros vigentes de precificação: alimentam o cálculo do item fora
    // do catálogo, feito na própria tela de venda.
    repositories.costParameters.findCurrent(),
    repositories.printers.findActive(),
    repositories.channelFees.findAllCurrent(),
    repositories.sizeTierRanges.findAllCurrent(),
    repositories.sizeTiers.findAll(),
  ]);

  const pricing = { costParameters, printers, channelFees, sizeTierRanges, sizeTiers };

  const canWrite = Boolean(currentUser && canWriteSalesOrder(currentUser));
  // Custo e lucro por pedido têm a mesma regra de quem pode lançar custo.
  const canSeeMoney = Boolean(currentUser && canWriteOrderCost(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Vendas cadastradas no ERP e pedidos vindos da loja do site, na mesma lista — com origem, quem vendeu, preço praticado e custo real."
        action={
          canWrite && (
            <SalesOrderForm
              origins={origins.filter((origin) => origin.isActive)}
              stages={stages}
              products={products}
              sellerNames={sellerNames}
              pricing={pricing}
            />
          )
        }
      />

      <VendasNav activeTab="pedidos" visibleTabs={visibleSalesTabs(currentUser)} />

      <SalesOrderFilters origins={origins} stages={stages} sellerNames={sellerNames} />

      <SalesOrderTable
        orders={orders}
        origins={origins}
        stages={stages}
        products={products}
        sellerNames={sellerNames}
        pricing={pricing}
        canWrite={canWrite}
        canSeeMoney={canSeeMoney}
      />
    </div>
  );
}
