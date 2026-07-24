import { SalesOrderCard } from "@/components/vendas/sales-order-card";
import { stageColorClass } from "@/components/vendas/labels";
import { cn } from "@/lib/utils";
import type { OrderPipelineStage, SaleOrigin, SalesOrderWithFinancials } from "@/types/vendas";
import type { Printer } from "@/types/pricing";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface SalesPipelineBoardProps {
  stages: OrderPipelineStage[];
  orders: SalesOrderWithFinancials[];
  origins: SaleOrigin[];
  printers: Printer[];
  activePrinters: Printer[];
  profiles: Profile[];
  canMove: boolean;
  canSeeMoney: boolean;
}

export function SalesPipelineBoard({
  stages,
  orders,
  origins,
  printers,
  activePrinters,
  profiles,
  canMove,
  canSeeMoney,
}: SalesPipelineBoardProps) {
  const originById = new Map(origins.map((origin) => [origin.id, origin]));
  const printerById = new Map(printers.map((printer) => [printer.id, printer]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return (
    // Colunas cadastráveis: o número varia, então o quadro rola na horizontal
    // em vez de tentar caber numa grade de largura fixa.
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {stages.map((stage) => {
          const columnOrders = orders.filter((order) => order.stageId === stage.id);

          return (
            <div
              key={stage.id}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-md border bg-muted/30 p-2"
            >
              <div className="flex items-center justify-between px-1">
                <h3
                  className={cn(
                    "rounded px-1.5 py-0.5 text-sm font-medium",
                    stageColorClass(stage.color),
                  )}
                >
                  {stage.name}
                </h3>
                <span className="text-xs text-muted-foreground">{columnOrders.length}</span>
              </div>

              {columnOrders.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                  Nenhum pedido.
                </p>
              ) : (
                columnOrders.map((order) => (
                  <SalesOrderCard
                    key={order.id}
                    order={order}
                    origin={order.saleOriginId ? originById.get(order.saleOriginId) : undefined}
                    seller={
                      order.soldByProfileId ? profileById.get(order.soldByProfileId) : undefined
                    }
                    currentPrinter={
                      order.currentPrinterId ? printerById.get(order.currentPrinterId) : undefined
                    }
                    activeStages={stages}
                    activePrinters={activePrinters}
                    canMove={canMove}
                    canSeeMoney={canSeeMoney}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
