import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UpdateCustomerStatusDialog } from "@/components/vendas/update-customer-status-dialog";
import { customerStatusLabel, formatCents } from "@/components/vendas/labels";
import { timelineStageLabel, resolvePetMiniatureTimelineStage } from "@/lib/pet-miniature/timeline";
import type { PetMiniatureBoardItem } from "@/components/producao/pet-miniature-board";

const VARIANT_LABEL: Record<string, string> = {
  sem_pintura: "Sem pintura",
  com_pintura: "Com pintura",
};

interface PetMiniatureTableProps {
  items: PetMiniatureBoardItem[];
  canWrite: boolean;
}

export function PetMiniatureTable({ items, canWrite }: PetMiniatureTableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border py-10 text-center text-sm text-muted-foreground">
        Nenhuma encomenda de miniatura de pet ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Criado em</TableHead>
            {canWrite && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(({ request, order }) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">
                {request.customerName || order?.customerName || "Sem nome ainda"}
              </TableCell>
              <TableCell>
                {order ? (
                  <Link
                    href={`/vendas/pedidos/${order.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {order.orderCode} · {formatCents(order.totalCents)}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Sem pedido</span>
                )}
              </TableCell>
              <TableCell>
                {request.selectedVariant ? (
                  <Badge variant="outline">
                    {VARIANT_LABEL[request.selectedVariant] ?? request.selectedVariant}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {timelineStageLabel(resolvePetMiniatureTimelineStage(request, order?.status ?? null))}
                </Badge>
                {order && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({customerStatusLabel(order.status)})
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(request.createdAt).toLocaleDateString("pt-BR")}
              </TableCell>
              {canWrite && (
                <TableCell>{order && <UpdateCustomerStatusDialog order={order} />}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
