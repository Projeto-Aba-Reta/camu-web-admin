"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StartPrintingDialog } from "@/components/fila-de-impressao/start-printing-dialog";
import { CompletePrintingDialog } from "@/components/fila-de-impressao/complete-printing-dialog";
import { CancelPrintQueueItemDialog } from "@/components/fila-de-impressao/cancel-print-queue-item-dialog";
import { PrintQueueCountdown } from "@/components/fila-de-impressao/print-queue-countdown";
import type { Material } from "@/types/inventory";
import type { Product } from "@/types/catalog";
import type { Printer } from "@/types/pricing";
import type { PrintQueueItem } from "@/types/print-queue";

export interface PrintQueueMaterialLine {
  material: Material;
  pieceGrams: number;
  supportGrams: number;
}

export interface PrintQueueRow {
  item: PrintQueueItem;
  product: Product;
  printer: Printer | null;
  // Impressoras ativas com ficha de fatiamento cadastrada para este
  // produto — só essas podem ser escolhidas no "play" (ver Requirement
  // "Início de impressão com sugestão de impressora ociosa").
  eligiblePrinters: Printer[];
  // Snapshot copiado da ficha no início da impressão. Vazio para itens
  // ainda `na_fila` (nada foi decidido até o play).
  materials: PrintQueueMaterialLine[];
}

interface PrintQueueBoardProps {
  rows: PrintQueueRow[];
  occupiedPrinterIds: Set<string>;
  canWrite: boolean;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "UTC" });
}

function formatMaterials(materials: PrintQueueMaterialLine[]): string {
  if (materials.length === 0) return "—";
  return materials
    .map((line) => `${line.material.name}: ${line.pieceGrams}g na peça + ${line.supportGrams}g em suporte`)
    .join(" · ");
}

interface PrintQueueSectionProps {
  title: string;
  rows: PrintQueueRow[];
  emptyMessage: string;
  showPrinter?: boolean;
  showMaterials?: boolean;
  showCountdown?: boolean;
  showFinishedAt?: boolean;
  renderActions?: (row: PrintQueueRow) => ReactNode;
}

function PrintQueueSection({
  title,
  rows,
  emptyMessage,
  showPrinter,
  showMaterials,
  showCountdown,
  showFinishedAt,
  renderActions,
}: PrintQueueSectionProps) {
  const columnCount =
    2 +
    (showPrinter ? 1 : 0) +
    (showMaterials ? 1 : 0) +
    (showCountdown ? 1 : 0) +
    (showFinishedAt ? 1 : 0) +
    (renderActions ? 1 : 0);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">
        {title} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              {showPrinter && <TableHead>Impressora</TableHead>}
              {showMaterials && <TableHead>Materiais</TableHead>}
              {showCountdown && <TableHead>Tempo restante</TableHead>}
              {showFinishedAt && <TableHead>Conclusão</TableHead>}
              {renderActions && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.item.id}>
                  <TableCell className="font-medium">{row.product.name}</TableCell>
                  <TableCell>{row.item.quantity}</TableCell>
                  {showPrinter && <TableCell>{row.printer?.name ?? "—"}</TableCell>}
                  {showMaterials && (
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      {formatMaterials(row.materials)}
                    </TableCell>
                  )}
                  {showCountdown && (
                    <TableCell>
                      <PrintQueueCountdown expectedFinishAt={row.item.expectedFinishAt} />
                    </TableCell>
                  )}
                  {showFinishedAt && <TableCell>{formatDateTime(row.item.finishedAt)}</TableCell>}
                  {renderActions && (
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">{renderActions(row)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function PrintQueueBoard({ rows, occupiedPrinterIds, canWrite }: PrintQueueBoardProps) {
  const router = useRouter();
  const naFila = rows.filter((row) => row.item.status === "na_fila");
  const imprimindo = rows.filter((row) => row.item.status === "imprimindo");
  const concluido = rows.filter((row) => row.item.status === "concluido");

  // Enquanto houver impressão em andamento, atualiza a página periodicamente
  // para refletir a conclusão automática (rotina agendada no servidor) sem
  // exigir que o usuário recarregue manualmente — ver Requirement
  // "Conclusão automática por tempo esgotado".
  useEffect(() => {
    if (imprimindo.length === 0) return;
    const interval = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(interval);
  }, [imprimindo.length, router]);

  return (
    <div className="space-y-8">
      <PrintQueueSection
        title="Na fila"
        rows={naFila}
        emptyMessage="Nenhum item na fila."
        renderActions={
          canWrite
            ? (row) => (
                <>
                  {row.eligiblePrinters.length > 0 ? (
                    <StartPrintingDialog
                      item={row.item}
                      product={row.product}
                      printers={row.eligiblePrinters}
                      occupiedPrinterIds={occupiedPrinterIds}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem ficha de fatiamento cadastrada</span>
                  )}
                  <CancelPrintQueueItemDialog item={row.item} product={row.product} />
                </>
              )
            : undefined
        }
      />

      <PrintQueueSection
        title="Imprimindo"
        rows={imprimindo}
        emptyMessage="Nenhuma impressão em andamento."
        showPrinter
        showMaterials
        showCountdown
        renderActions={
          canWrite
            ? (row) => (
                <>
                  <CompletePrintingDialog item={row.item} product={row.product} materials={row.materials} />
                  <CancelPrintQueueItemDialog item={row.item} product={row.product} />
                </>
              )
            : undefined
        }
      />

      <PrintQueueSection
        title="Concluído"
        rows={concluido}
        emptyMessage="Nenhuma impressão concluída ainda."
        showPrinter
        showFinishedAt
      />
    </div>
  );
}
