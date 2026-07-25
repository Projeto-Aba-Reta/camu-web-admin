"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderCostForm } from "@/components/vendas/order-cost-form";
import { ORDER_COST_CATEGORY_LABEL, NO_COST_WARNING, formatCents } from "@/components/vendas/labels";
import { deleteOrderCostAction } from "@/app/(dashboard)/vendas/actions";
import type { OrderCost } from "@/types/vendas";

interface OrderCostListProps {
  orderId: string;
  costs: OrderCost[];
  canWrite: boolean;
}

export function OrderCostList({ orderId, costs, canWrite }: OrderCostListProps) {
  const router = useRouter();

  async function handleDelete(costId: string) {
    const result = await deleteOrderCostAction(costId);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível excluir o custo.");
      return;
    }
    toast.success("Custo excluído.");
    router.refresh();
  }

  const total = costs.reduce((sum, cost) => sum + cost.amountCents, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Custo real</h3>
        {canWrite && <OrderCostForm orderId={orderId} />}
      </div>

      {costs.length === 0 ? (
        // Custo ausente não é custo zero — sem este aviso o lucro exibido
        // seria lido como margem de 100%.
        <Badge variant="outline">{NO_COST_WARNING}</Badge>
      ) : (
        <>
          <ul className="divide-y rounded-md border">
            {costs.map((cost) => (
              <li key={cost.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {formatCents(cost.amountCents)}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {ORDER_COST_CATEGORY_LABEL[cost.category]}
                    </span>
                  </p>
                  {cost.description && (
                    <p className="truncate text-xs text-muted-foreground">{cost.description}</p>
                  )}
                </div>

                {/* O lançamento derivado da precificação é reescrito a cada
                    gravação do pedido — editá-lo aqui seria desfeito sozinho.
                    Para mudá-lo, edita-se o item do pedido. */}
                {cost.source === "precificacao" ? (
                  <Badge variant="outline" className="shrink-0">
                    da precificação
                  </Badge>
                ) : (
                  canWrite && (
                    <div className="flex shrink-0 gap-1">
                      <OrderCostForm orderId={orderId} cost={cost} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cost.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">Total gasto: {formatCents(total)}</p>
        </>
      )}
    </div>
  );
}
