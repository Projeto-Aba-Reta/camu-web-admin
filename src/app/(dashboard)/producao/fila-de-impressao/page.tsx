import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWritePrintQueue } from "@/lib/auth/print-queue-access";
import { PageHeader } from "@/components/layout/page-header";
import { ProducaoNav } from "@/components/producao/producao-nav";
import { PrintQueueAddForm } from "@/components/fila-de-impressao/print-queue-add-form";
import {
  PrintQueueBoard,
  type PrintQueueMaterialLine,
  type PrintQueueRow,
} from "@/components/fila-de-impressao/print-queue-board";

export default async function FilaDeImpressaoPage() {
  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const [items, products, materials, allPrinters, activePrinters] = await Promise.all([
    repositories.printQueueItems.listByStatus(["na_fila", "imprimindo", "concluido"]),
    repositories.products.findAll(),
    repositories.materials.findAll(),
    repositories.printers.findAll(),
    repositories.printers.findActive(),
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const printerById = new Map(allPrinters.map((printer) => [printer.id, printer]));

  // Poucos produtos/impressoras nesta escala — uma consulta de fichas por
  // produto é aceitável e mais simples do que um método de busca em lote.
  const sheetsByProductId = new Map(
    await Promise.all(
      products.map(
        async (product) => [product.id, await repositories.slicingSheets.findByProductId(product.id)] as const,
      ),
    ),
  );

  const occupiedPrinterIds = new Set(
    items
      .filter((item) => item.status === "imprimindo" && item.printerId !== null)
      .map((item) => item.printerId as string),
  );

  const imprimindoItems = items.filter((item) => item.status === "imprimindo");
  const materialsByItemId = new Map(
    await Promise.all(
      imprimindoItems.map(
        async (item) => [item.id, await repositories.printQueueItems.findMaterialsByItemId(item.id)] as const,
      ),
    ),
  );

  const rows: PrintQueueRow[] = items
    .map((item) => {
      const product = productById.get(item.productId);
      if (!product) return null;

      const printer = item.printerId ? (printerById.get(item.printerId) ?? null) : null;
      const sheets = sheetsByProductId.get(item.productId) ?? [];
      const eligiblePrinters = activePrinters.filter((activePrinter) =>
        sheets.some((sheet) => sheet.printerId === activePrinter.id),
      );

      const materialLines: PrintQueueMaterialLine[] = (materialsByItemId.get(item.id) ?? [])
        .map((line) => {
          const material = materialById.get(line.materialId);
          return material ? { material, pieceGrams: line.pieceGrams, supportGrams: line.supportGrams } : null;
        })
        .filter((line): line is PrintQueueMaterialLine => line !== null);

      return { item, product, printer, eligiblePrinters, materials: materialLines };
    })
    .filter((row): row is PrintQueueRow => row !== null);

  const canWrite = Boolean(currentUser && canWritePrintQueue(currentUser));
  const eligibleProducts = products.filter((product) => (sheetsByProductId.get(product.id) ?? []).length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fila de impressão"
        description="Monte a fila a partir do catálogo, inicie e conclua impressões — o estoque de peças prontas e de insumos é atualizado automaticamente ao concluir (manualmente ou quando o tempo estimado esgota), com notificação no Slack."
        action={canWrite && <PrintQueueAddForm products={eligibleProducts} />}
      />

      <ProducaoNav />

      <PrintQueueBoard rows={rows} occupiedPrinterIds={occupiedPrinterIds} canWrite={canWrite} />
    </div>
  );
}
