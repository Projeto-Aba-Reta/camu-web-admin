"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaleOriginForm } from "@/components/vendas/sale-origin-form";
import { setSaleOriginActiveAction } from "@/app/(dashboard)/vendas/actions";
import type { SaleOrigin } from "@/types/vendas";

interface SaleOriginListProps {
  origins: SaleOrigin[];
  orderCountByOriginId: Record<string, number>;
}

export function SaleOriginList({ origins, orderCountByOriginId }: SaleOriginListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function setActive(origin: SaleOrigin, isActive: boolean) {
    startTransition(async () => {
      const result = await setSaleOriginActiveAction(origin.id, isActive);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível alterar a origem.");
        return;
      }
      toast.success(isActive ? `"${origin.name}" reativada.` : `"${origin.name}" arquivada.`);
      router.refresh();
    });
  }

  return (
    <ul className="divide-y rounded-md border">
      {origins.map((origin) => {
        const orderCount = orderCountByOriginId[origin.id] ?? 0;

        return (
          <li key={origin.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <span className="text-sm text-foreground">{origin.name}</span>
            {origin.requiresSeller && <Badge variant="outline">exige vendedor</Badge>}
            {!origin.isActive && <Badge variant="secondary">arquivada</Badge>}
            <span className="text-xs text-muted-foreground">
              {orderCount} pedido{orderCount === 1 ? "" : "s"}
            </span>

            <div className="ml-auto flex items-center gap-1">
              <SaleOriginForm origin={origin} />

              {origin.isActive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  // Arquivar, não excluir: a origem precisa sobreviver nos
                  // pedidos que já a usam e nos recortes do resultado.
                  title="Arquivar — sai do formulário de pedidos, fica no histórico"
                  disabled={isPending}
                  onClick={() => setActive(origin, false)}
                >
                  <Archive className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setActive(origin, true)}
                >
                  <RotateCcw className="size-4" />
                  Reativar
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
