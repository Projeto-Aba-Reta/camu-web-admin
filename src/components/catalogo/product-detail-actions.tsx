"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeleteProductDialog } from "@/components/catalogo/delete-product-dialog";
import type { Product } from "@/types/catalog";

interface ProductDetailActionsProps {
  product: Pick<Product, "id" | "name" | "status">;
}

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Excluir peça
      </Button>

      {open && (
        <DeleteProductDialog
          product={product}
          onOpenChange={setOpen}
          onCompleted={(outcome) => {
            setOpen(false);
            // A peça excluída deixa de existir, então esta rota também: volta
            // para a listagem. A descontinuada continua aqui, só muda de status.
            if (outcome === "deleted") {
              router.push("/producao/catalogo");
            }
            router.refresh();
          }}
        />
      )}
    </>
  );
}
