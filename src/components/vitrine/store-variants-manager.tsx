"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addStoreVariantAction,
  removeStoreVariantAction,
  updateStoreVariantAction,
} from "@/app/(dashboard)/vitrine/actions";
import type { StoreVariant } from "@/lib/vitrine/types";
import { centsToReaisInput, parseReaisToCents } from "./money-input";

export function StoreVariantsManager({
  productId,
  initialVariants,
}: {
  productId: string;
  initialVariants: StoreVariant[];
}) {
  const router = useRouter();
  const [variants, setVariants] = useState(initialVariants);
  const [label, setLabel] = useState("");
  const [delta, setDelta] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const r = await addStoreVariantAction(productId, label, parseReaisToCents(delta) ?? 0, variants.length);
      if (!r.ok || !r.variant) { toast.error(r.error ?? "Não foi possível criar a variante."); return; }
      setVariants((cur) => [...cur, r.variant!]);
      setLabel("");
      setDelta("");
      router.refresh();
    });
  }

  function toggle(v: StoreVariant) {
    startTransition(async () => {
      const r = await updateStoreVariantAction(productId, v.id, { active: !v.active });
      if (!r.ok) { toast.error(r.error ?? "Não foi possível salvar."); return; }
      setVariants((cur) => cur.map((x) => (x.id === v.id ? { ...x, active: !x.active } : x)));
    });
  }

  function remove(v: StoreVariant) {
    startTransition(async () => {
      const r = await removeStoreVariantAction(productId, v.id);
      if (!r.ok) { toast.error(r.error ?? "Não foi possível remover."); return; }
      setVariants((cur) => cur.filter((x) => x.id !== v.id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Opcional. Ex.: &quot;Pequena&quot;, &quot;Grande (+ R$ 20,00)&quot;. O valor é somado ao preço do produto. Sem variantes, o cliente compra a
        versão padrão.
      </p>
      {variants.map((v) => (
        <div key={v.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
          <span className="flex-1">{v.label}</span>
          <span className="text-muted-foreground">
            {v.priceDeltaCents === 0 ? "mesmo preço" : `${v.priceDeltaCents > 0 ? "+" : "−"} R$ ${centsToReaisInput(Math.abs(v.priceDeltaCents))}`}
          </span>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => toggle(v)}>
            {v.active ? "Ativa" : "Inativa"}
          </Button>
          <Button type="button" size="icon" variant="ghost" disabled={pending} onClick={() => remove(v)}>
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Input className="w-48" placeholder="Nome da variante" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input
          className="w-36"
          inputMode="decimal"
          placeholder="+ R$ (opcional)"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
        />
        <Button type="button" size="sm" variant="outline" disabled={pending || !label.trim()} onClick={add}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
