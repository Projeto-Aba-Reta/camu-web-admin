"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateSystemSettingAction } from "@/app/(dashboard)/admin/configuracoes/actions";
import type { Json } from "@/lib/supabase/database.types";

function toDisplayValue(value: Json): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function toStoredValue(raw: string): Json {
  try {
    return JSON.parse(raw) as Json;
  } catch {
    return raw;
  }
}

interface SystemSettingFormProps {
  settingKey: string;
  label: string;
  value: Json;
}

export function SystemSettingForm({ settingKey, label, value }: SystemSettingFormProps) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState(toDisplayValue(value));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setRawValue(toDisplayValue(value));
    setOpen(nextOpen);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const result = await updateSystemSettingAction(settingKey, toStoredValue(rawValue));
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a configuração.");
      return;
    }

    toast.success("Configuração atualizada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {label}</DialogTitle>
          <DialogDescription>Chave: {settingKey}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="setting-value">Valor</Label>
          <Input
            id="setting-value"
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
