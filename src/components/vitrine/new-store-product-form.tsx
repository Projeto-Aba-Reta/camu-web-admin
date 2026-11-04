"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStoreProductAction } from "@/app/(dashboard)/vitrine/actions";
import { parseReaisToCents } from "./money-input";

export function NewStoreProductForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseReaisToCents(price) ?? 0;
    startTransition(async () => {
      const result = await createStoreProductAction(title, cents);
      if (!result.ok || !result.productId) {
        toast.error(result.error ?? "Não foi possível criar o produto.");
        return;
      }
      router.push(`/vitrine/${result.productId}`);
    });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-md border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Nome do produto</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="price">Preço (R$)</Label>
        <Input
          id="price"
          inputMode="decimal"
          placeholder="49,90"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending || !title.trim()}>
        {pending ? "Criando..." : "Continuar"}
      </Button>
    </form>
  );
}
