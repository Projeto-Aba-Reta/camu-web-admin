import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { UpdateCustomerStatusDialog } from "@/components/vendas/update-customer-status-dialog";
import { customerStatusLabel, formatCents } from "@/components/vendas/labels";
import { petMiniaturePublicMediaUrl } from "@/lib/pet-miniature/timeline";
import type { PetMiniatureRequest } from "@/types/pet-miniature";
import type { SalesOrderWithFinancials } from "@/types/vendas";

const VARIANT_LABEL: Record<string, string> = {
  sem_pintura: "Sem pintura",
  com_pintura: "Com pintura",
};

interface PetMiniatureCardProps {
  request: PetMiniatureRequest;
  order: SalesOrderWithFinancials | null;
  canWrite: boolean;
}

export function PetMiniatureCard({ request, order, canWrite }: PetMiniatureCardProps) {
  // Prévia pintada é a que mais importa pro time bater o olho — cai pra
  // "sem pintura" só quando a variante pintada falhou/não foi gerada ainda.
  const previewPath = request.generatedImagePaintedPath ?? request.generatedImagePlainPath;
  const customerName = request.customerName || order?.customerName || "Sem nome ainda";

  return (
    <div className="space-y-2 rounded border bg-background p-2">
      <div className="flex items-start gap-2">
        {previewPath ? (
          <img
            src={petMiniaturePublicMediaUrl(previewPath)}
            alt={`Prévia da miniatura de ${customerName}`}
            className="size-14 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
            Sem prévia
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{customerName}</p>
          {order ? (
            <Link
              href={`/vendas/pedidos/${order.id}`}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {order.orderCode} · {formatCents(order.totalCents)}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">Ainda sem pedido</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {request.selectedVariant && (
          <Badge variant="outline">{VARIANT_LABEL[request.selectedVariant] ?? request.selectedVariant}</Badge>
        )}
        {order && <Badge variant="secondary">{customerStatusLabel(order.status)}</Badge>}
      </div>

      {request.status === "falhou" && request.aiError && (
        <p className="text-xs text-destructive">Erro na geração: {request.aiError}</p>
      )}

      {canWrite && order && (
        <div>
          <UpdateCustomerStatusDialog order={order} />
        </div>
      )}
    </div>
  );
}
