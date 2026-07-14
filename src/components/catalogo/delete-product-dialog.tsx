"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteProductAction,
  discontinueProductAction,
  getProductDeletionCheckAction,
} from "@/app/(dashboard)/producao/catalogo/actions";
import type { ProductDeletionCheck } from "@/lib/services/catalog-service";
import type { Product } from "@/types/catalog";

// Controlado, sem trigger próprio: na listagem ele é aberto por um item de
// DropdownMenu, e um AlertDialogTrigger aninhado no menu seria desmontado
// junto com o menu ao fechar. Quem chama monta o componente só quando há peça
// selecionada — daí o estado da checagem já nasce limpo a cada abertura.
interface DeleteProductDialogProps {
  product: Pick<Product, "id" | "name" | "status">;
  onOpenChange: (open: boolean) => void;
  // As duas saídas são distintas: descontinuar preserva a peça (e sua rota de
  // detalhe), excluir não. Quem chama decide o que fazer em cada caso.
  onCompleted: (outcome: "deleted" | "discontinued") => void;
}

function cascadeSummary(cascade: ProductDeletionCheck["cascade"]): string | null {
  const parts: string[] = [];
  if (cascade.media > 0) parts.push(`${cascade.media} foto(s)`);
  if (cascade.channelListings > 0) parts.push(`${cascade.channelListings} listagem(ns) por canal`);
  if (cascade.slicingSheets > 0) parts.push(`${cascade.slicingSheets} ficha(s) de fatiamento`);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function DeleteProductDialog({ product, onOpenChange, onCompleted }: DeleteProductDialogProps) {
  const [check, setCheck] = useState<ProductDeletionCheck | null>(null);
  const [isPending, startTransition] = useTransition();
  const productId = product.id;

  // As guardas são consultadas ao abrir, não na renderização da listagem
  // (ver design.md decisão 4).
  useEffect(() => {
    let current = true;

    void (async () => {
      const result = await getProductDeletionCheckAction(productId);
      if (!current) return;
      if (!result.ok || !result.check) {
        toast.error(result.error ?? "Não foi possível verificar os vínculos da peça.");
        onOpenChange(false);
        return;
      }
      setCheck(result.check);
    })();

    return () => {
      current = false;
    };
    // onOpenChange é estável no uso atual; só a peça deve disparar a checagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível excluir a peça.");
        return;
      }
      toast.success(`Peça "${product.name}" excluída.`);
      onOpenChange(false);
      onCompleted("deleted");
    });
  }

  function handleDiscontinue() {
    startTransition(async () => {
      const result = await discontinueProductAction(product.id);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível descontinuar a peça.");
        return;
      }
      toast.success(`Peça "${product.name}" descontinuada.`);
      onOpenChange(false);
      onCompleted("discontinued");
    });
  }

  const cascade = check ? cascadeSummary(check.cascade) : null;
  const alreadyDiscontinued = product.status === "descontinuado";

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {check && !check.canDelete
              ? `Não é possível excluir "${product.name}"`
              : `Excluir peça "${product.name}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {!check ? (
                <p>Verificando os vínculos desta peça…</p>
              ) : check.canDelete ? (
                <>
                  <p>
                    Esta peça não tem histórico de produção nem de estoque, então pode ser removida
                    permanentemente. Esta ação não pode ser desfeita.
                  </p>
                  {cascade && <p>Serão removidos junto: {cascade}.</p>}
                </>
              ) : (
                <>
                  <p>Esta peça tem histórico e removê-la apagaria registros de produção ou estoque:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {check.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                  <p>
                    {alreadyDiscontinued
                      ? "A peça já está descontinuada e não aparece mais como ativa no catálogo."
                      : "Você pode descontinuá-la: ela sai do catálogo ativo e todo o histórico é preservado."}
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {check && !check.canDelete && alreadyDiscontinued ? "Fechar" : "Cancelar"}
          </AlertDialogCancel>

          {check?.canDelete && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          )}

          {check && !check.canDelete && !alreadyDiscontinued && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDiscontinue();
              }}
              disabled={isPending}
            >
              Descontinuar peça
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
