import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderCostList } from "@/components/vendas/order-cost-list";
import {
  DEFAULT_ORIGIN_LABEL,
  NO_COST_WARNING,
  formatCents,
  stageColorClass,
} from "@/components/vendas/labels";
import { cn } from "@/lib/utils";
import type {
  OrderCost,
  OrderPipelineStage,
  OrderStageEvent,
  SaleOrigin,
  SalesOrderWithFinancials,
} from "@/types/vendas";
import type { Printer } from "@/types/pricing";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface SalesOrderDetailProps {
  order: SalesOrderWithFinancials;
  origins: SaleOrigin[];
  stages: OrderPipelineStage[];
  printers: Printer[];
  profiles: Profile[];
  costs: OrderCost[];
  events: OrderStageEvent[];
  canWriteCost: boolean;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

export function SalesOrderDetail({
  order,
  origins,
  stages,
  printers,
  profiles,
  costs,
  events,
  canWriteCost,
}: SalesOrderDetailProps) {
  const originById = new Map(origins.map((origin) => [origin.id, origin]));
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const printerById = new Map(printers.map((printer) => [printer.id, printer]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const origin = order.saleOriginId ? originById.get(order.saleOriginId) : undefined;
  const stage = order.stageId ? stageById.get(order.stageId) : undefined;
  const currentPrinter = order.currentPrinterId
    ? printerById.get(order.currentPrinterId)
    : undefined;
  const noCost = order.financials.costEntries === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <section className="space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {stage && (
              <Badge className={cn("font-normal", stageColorClass(stage.color))}>{stage.name}</Badge>
            )}
            <Badge variant="outline">{origin?.name ?? DEFAULT_ORIGIN_LABEL}</Badge>
            {currentPrinter && <Badge variant="secondary">{currentPrinter.name}</Badge>}
            {/* orders.status só é exibido quando importa para vendas: pedido
                cancelado sai do resultado (design, decisão 2). */}
            {order.status === "cancelled" && <Badge variant="destructive">Cancelado</Badge>}
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Comprador</dt>
              <dd className="text-foreground">{order.customerName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Quem vendeu</dt>
              <dd className="text-foreground">{order.soldByName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contato</dt>
              <dd className="text-foreground">
                {[order.customerPhone, order.customerEmail].filter(Boolean).join(" · ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entrega</dt>
              <dd className="text-foreground">
                {[order.addressLine, order.addressCity, order.addressUf, order.addressCep]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cadastrado em</dt>
              <dd className="text-foreground">{formatDateTime(order.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2 rounded-md border p-4">
          <h2 className="text-sm font-medium">Itens</h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  {/* Nome e preço são snapshot da venda — renomear a peça no
                      catálogo não muda o que está aqui. */}
                  <p className="truncate text-foreground">{item.productName}</p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">{item.variant}</p>
                  )}
                  {/* Sem peça associada: ou o item nasceu fora do catálogo,
                      ou a peça foi excluída depois da venda. O dado não
                      distingue os dois casos, então o rótulo não afirma qual é. */}
                  {!item.productId && (
                    <p className="text-xs text-muted-foreground">sem peça do catálogo</p>
                  )}
                  {item.unitCostCents !== null && (
                    <p className="text-xs text-muted-foreground">
                      custo estimado: {formatCents(item.unitCostCents)}/un.
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {item.qty} × {formatCents(item.unitPriceCents)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatCents(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Frete</dt>
              <dd>{formatCents(order.shippingCents)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total vendido</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2 rounded-md border p-4">
          <h2 className="text-sm font-medium">Histórico no funil</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <ol className="space-y-2">
              {events.map((event) => {
                const from = event.fromStageId ? stageById.get(event.fromStageId) : undefined;
                const to = stageById.get(event.toStageId);
                const author = event.createdBy ? profileById.get(event.createdBy) : undefined;
                const printer = event.printerId ? printerById.get(event.printerId) : undefined;

                return (
                  <li key={event.id} className="text-sm">
                    <p className="text-foreground">
                      {from ? `${from.name} → ${to?.name ?? "?"}` : `Entrou em ${to?.name ?? "?"}`}
                      {printer && ` · ${printer.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                      {author && ` · ${author.fullName ?? author.email}`}
                      {event.note && ` · ${event.note}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="space-y-2 rounded-md border p-4">
          <h2 className="text-sm font-medium">Resultado deste pedido</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Vendido</dt>
              <dd>{formatCents(order.financials.revenueCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Gasto</dt>
              <dd>{formatCents(order.financials.costCents)}</dd>
            </div>
            <div
              className={cn(
                "flex justify-between font-medium",
                order.financials.profitCents < 0 && "text-destructive",
              )}
            >
              <dt>{order.financials.profitCents < 0 ? "Prejuízo" : "Lucro"}</dt>
              <dd>{formatCents(order.financials.profitCents)}</dd>
            </div>
          </dl>

          {noCost && (
            // Sem este aviso, o lucro igual ao total de venda seria lido como
            // margem de 100%.
            <p className="text-xs text-muted-foreground">
              {NO_COST_WARNING} — o lucro acima é o total vendido.
            </p>
          )}
        </section>

        <section className="rounded-md border p-4">
          <OrderCostList orderId={order.id} costs={costs} canWrite={canWriteCost} />
        </section>
      </aside>
    </div>
  );
}
