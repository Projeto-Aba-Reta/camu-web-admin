"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateMiniaturaPriceAction,
  type MiniaturaPrices,
  type MiniaturaVariant,
} from "@/app/(dashboard)/vendas/configuracoes/miniatura-actions";
import { centsToReaisInput, parseReaisToCents } from "@/components/vitrine/money-input";

function Row({ variant, label, initial }: { variant: MiniaturaVariant; label: string; initial: number | null }) {
  const [value, setValue] = useState(centsToReaisInput(initial));
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await updateMiniaturaPriceAction(variant, parseReaisToCents(value) ?? 0);
      if (r.ok) toast.success("Preço atualizado.");
      else toast.error(r.error ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label>{label} (R$)</Label>
        <Input className="w-40" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <Button size="sm" disabled={pending} onClick={save}>
        Salvar
      </Button>
    </div>
  );
}

export function MiniaturaPriceForm({ prices }: { prices: MiniaturaPrices }) {
  if (!prices.configured) {
    return (
      <p className="text-sm text-muted-foreground">
        Defina PET_MINIATURE_PRODUCT_ID_SEM_PINTURA e PET_MINIATURE_PRODUCT_ID_COM_PINTURA no ambiente do admin (os
        mesmos valores da landing) para editar os preços aqui.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-6">
      <Row variant="sem_pintura" label="Sem pintura" initial={prices.semPinturaCents} />
      <Row variant="com_pintura" label="Com pintura" initial={prices.comPinturaCents} />
    </div>
  );
}
