import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canConfigureSales } from "@/lib/auth/sales-access";
import { visibleSalesTabs } from "@/lib/auth/sales-tabs";
import { SalesService } from "@/lib/services/sales-service";
import { SalesPipelineService } from "@/lib/services/sales-pipeline-service";
import { PageHeader } from "@/components/layout/page-header";
import { VendasNav } from "@/components/vendas/vendas-nav";
import { PipelineStageForm } from "@/components/vendas/pipeline-stage-form";
import { PipelineStageList } from "@/components/vendas/pipeline-stage-list";
import { SaleOriginForm } from "@/components/vendas/sale-origin-form";
import { SaleOriginList } from "@/components/vendas/sale-origin-list";

export default async function VendasConfiguracoesPage() {
  const currentUser = await getCurrentProfile();

  // O layout da área é mais permissivo que esta aba (Requirement "Abas da
  // área Vendas") — daí o guard próprio.
  if (!currentUser || !canConfigureSales(currentUser)) {
    redirect("/vendas/pedidos");
  }

  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const service = new SalesService(repositories);
  const pipeline = new SalesPipelineService(repositories);

  const [stages, origins, orders] = await Promise.all([
    pipeline.listStages(),
    service.listOrigins(),
    // A contagem por etapa/origem sai de uma leitura só dos pedidos — com o
    // volume desta operação, é mais barato que uma query de count por linha.
    service.list(),
  ]);

  const orderCountByStageId: Record<string, number> = {};
  const orderCountByOriginId: Record<string, number> = {};
  for (const order of orders) {
    if (order.stageId) {
      orderCountByStageId[order.stageId] = (orderCountByStageId[order.stageId] ?? 0) + 1;
    }
    if (order.saleOriginId) {
      orderCountByOriginId[order.saleOriginId] =
        (orderCountByOriginId[order.saleOriginId] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações de Vendas"
        description="As colunas do funil e as origens de venda são cadastráveis — nomes, ordem e cores são decisão do time, não do código."
      />

      <VendasNav activeTab="configuracoes" visibleTabs={visibleSalesTabs(currentUser)} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-foreground">Etapas do funil</h2>
            <p className="text-sm text-muted-foreground">
              Uma etapa com pedidos não pode ser arquivada, e a etapa inicial precisa ser passada
              para outra antes de sair do quadro.
            </p>
          </div>
          <PipelineStageForm />
        </div>

        <PipelineStageList stages={stages} orderCountByStageId={orderCountByStageId} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-foreground">Origens de venda</h2>
            <p className="text-sm text-muted-foreground">
              Origem já usada por um pedido é arquivada, nunca excluída — ela precisa continuar
              legível no histórico e nos recortes do resultado.
            </p>
          </div>
          <SaleOriginForm />
        </div>

        <SaleOriginList origins={origins} orderCountByOriginId={orderCountByOriginId} />
      </section>
    </div>
  );
}
