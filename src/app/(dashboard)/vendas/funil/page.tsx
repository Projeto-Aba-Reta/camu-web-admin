import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canMoveSalesOrder, canWriteOrderCost } from "@/lib/auth/sales-access";
import { visibleSalesTabs } from "@/lib/auth/sales-tabs";
import { SalesPipelineService } from "@/lib/services/sales-pipeline-service";
import { PageHeader } from "@/components/layout/page-header";
import { VendasNav } from "@/components/vendas/vendas-nav";
import { SalesPipelineBoard } from "@/components/vendas/sales-pipeline-board";
import { Button } from "@/components/ui/button";

interface FunilPageProps {
  // `?historico=1` traz de volta os pedidos finalizados há mais de 30 dias
  // (design, decisão 10). Sem isso a coluna "Enviado" cresceria sem fim.
  searchParams: Promise<{ historico?: string }>;
}

export default async function FunilPage({ searchParams }: FunilPageProps) {
  const { historico } = await searchParams;
  const showHistory = historico === "1";

  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const pipeline = new SalesPipelineService(repositories);

  const [stages, orders, origins, printers, activePrinters] = await Promise.all([
    pipeline.listStages(true),
    pipeline.listBoardOrders(showHistory),
    repositories.saleOrigins.listAll(),
    repositories.printers.findAll(),
    repositories.printers.findActive(),
  ]);

  const canMove = Boolean(currentUser && canMoveSalesOrder(currentUser));
  const canSeeMoney = Boolean(currentUser && canWriteOrderCost(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funil de pedidos"
        description="Da modelagem ao envio. As colunas são cadastráveis em Configurações, e a movimentação é livre — voltar um pedido por reimpressão é esperado."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={showHistory ? "/vendas/funil" : "/vendas/funil?historico=1"}>
              {showHistory ? "Ocultar finalizados antigos" : "Mostrar finalizados antigos"}
            </Link>
          </Button>
        }
      />

      <VendasNav activeTab="funil" visibleTabs={visibleSalesTabs(currentUser)} />

      {stages.length === 0 ? (
        <p className="rounded-md border py-10 text-center text-sm text-muted-foreground">
          Nenhuma etapa ativa no funil. Cadastre as etapas em Configurações.
        </p>
      ) : (
        <SalesPipelineBoard
          stages={stages}
          orders={orders}
          origins={origins}
          printers={printers}
          activePrinters={activePrinters}
          canMove={canMove}
          canSeeMoney={canSeeMoney}
        />
      )}

      {!showHistory && (
        <p className="text-xs text-muted-foreground">
          Pedidos na etapa final há mais de 30 dias ficam fora do quadro — nada é excluído, só
          deixa de ser exibido.
        </p>
      )}
    </div>
  );
}
