import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesOrderForm } from "@/components/vendas/sales-order-form";
import { DeleteSalesOrderDialog } from "@/components/vendas/delete-sales-order-dialog";
import {
  DEFAULT_ORIGIN_LABEL,
  NO_COST_WARNING,
  formatCents,
  stageColorClass,
} from "@/components/vendas/labels";
import { cn } from "@/lib/utils";
import type { OrderPipelineStage, SaleOrigin, SalesOrderWithFinancials } from "@/types/vendas";
import type { Product } from "@/types/catalog";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface SalesOrderTableProps {
  orders: SalesOrderWithFinancials[];
  origins: SaleOrigin[];
  stages: OrderPipelineStage[];
  products: Product[];
  profiles: Profile[];
  canWrite: boolean;
  canSeeMoney: boolean;
}

export function SalesOrderTable({
  orders,
  origins,
  stages,
  products,
  profiles,
  canWrite,
  canSeeMoney,
}: SalesOrderTableProps) {
  const originById = new Map(origins.map((origin) => [origin.id, origin]));
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  if (orders.length === 0) {
    return (
      <p className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        Nenhum pedido no período ou nos filtros escolhidos.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Vendedor</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead className="text-right">Venda</TableHead>
            {canSeeMoney && <TableHead className="text-right">Custo</TableHead>}
            {canSeeMoney && <TableHead className="text-right">Lucro</TableHead>}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const origin = order.saleOriginId ? originById.get(order.saleOriginId) : undefined;
            const stage = order.stageId ? stageById.get(order.stageId) : undefined;
            const seller = order.soldByProfileId
              ? profileById.get(order.soldByProfileId)
              : undefined;
            const noCost = order.financials.costEntries === 0;

            return (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/vendas/pedidos/${order.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {order.orderCode}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </TableCell>
                <TableCell>{order.customerName ?? "—"}</TableCell>
                <TableCell>
                  {/* Origem nula = pedido da loja do site: rotulado, não gravado. */}
                  {origin?.name ?? DEFAULT_ORIGIN_LABEL}
                  {origin && !origin.isActive && (
                    <Badge variant="outline" className="ml-1">
                      arquivada
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{seller?.fullName ?? seller?.email ?? "—"}</TableCell>
                <TableCell>
                  {stage ? (
                    <Badge className={cn("font-normal", stageColorClass(stage.color))}>
                      {stage.name}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCents(order.totalCents)}</TableCell>

                {canSeeMoney && (
                  <TableCell className="text-right">
                    {noCost ? (
                      <span className="text-xs text-muted-foreground">{NO_COST_WARNING}</span>
                    ) : (
                      formatCents(order.financials.costCents)
                    )}
                  </TableCell>
                )}

                {canSeeMoney && (
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      order.financials.profitCents < 0 && "text-destructive",
                    )}
                  >
                    {formatCents(order.financials.profitCents)}
                  </TableCell>
                )}

                <TableCell>
                  {canWrite && (
                    <div className="flex justify-end gap-1">
                      <SalesOrderForm
                        origins={origins.filter((candidate) => candidate.isActive)}
                        stages={stages}
                        products={products}
                        profiles={profiles}
                        order={order}
                      />
                      <DeleteSalesOrderDialog order={order} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
