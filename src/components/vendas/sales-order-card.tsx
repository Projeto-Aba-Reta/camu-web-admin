import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MoveOrderDialog } from "@/components/vendas/move-order-dialog";
import { DEFAULT_ORIGIN_LABEL, NO_COST_WARNING, formatCents } from "@/components/vendas/labels";
import type { OrderPipelineStage, SaleOrigin, SalesOrderWithFinancials } from "@/types/vendas";
import type { Printer } from "@/types/pricing";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface SalesOrderCardProps {
  order: SalesOrderWithFinancials;
  origin: SaleOrigin | undefined;
  seller: Profile | undefined;
  currentPrinter: Printer | undefined;
  activeStages: OrderPipelineStage[];
  activePrinters: Printer[];
  canMove: boolean;
  canSeeMoney: boolean;
}

export function SalesOrderCard({
  order,
  origin,
  seller,
  currentPrinter,
  activeStages,
  activePrinters,
  canMove,
  canSeeMoney,
}: SalesOrderCardProps) {
  return (
    <div className="space-y-2 rounded border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/vendas/pedidos/${order.id}`}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {order.orderCode}
        </Link>
        <span className="shrink-0 text-sm text-muted-foreground">
          {formatCents(order.totalCents)}
        </span>
      </div>

      <p className="truncate text-sm text-foreground">{order.customerName ?? "Sem comprador"}</p>

      <div className="flex flex-wrap gap-1">
        {/* Origem nula = pedido da loja do site (design, decisão 1). */}
        <Badge variant="outline">{origin?.name ?? DEFAULT_ORIGIN_LABEL}</Badge>
        {/* Em qual impressora o pedido está agora — o pedido da etapa
            "Imprimindo" só é útil no quadro se disser a máquina. */}
        {currentPrinter && <Badge variant="secondary">{currentPrinter.name}</Badge>}
        {canSeeMoney && order.financials.costEntries === 0 && (
          <Badge variant="outline">{NO_COST_WARNING}</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {seller ? `Vendeu: ${seller.fullName ?? seller.email}` : "Sem vendedor atribuído"}
        {canSeeMoney && order.financials.costEntries > 0 && (
          <> · Lucro: {formatCents(order.financials.profitCents)}</>
        )}
      </p>

      {canMove && (
        <MoveOrderDialog order={order} stages={activeStages} activePrinters={activePrinters} />
      )}
    </div>
  );
}
