"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATERIAL_TYPE_LABEL } from "@/components/estoque/constants";
import { FILAMENT_UNITS, materialFormSchema, type MaterialFormValues } from "@/lib/validation/inventory-schemas";
import { createMaterialAction, updateMaterialAction } from "@/app/(dashboard)/producao/estoque/actions";
import type { Material } from "@/types/inventory";

interface MaterialFormProps {
  material?: Material;
}

function defaultValues(material?: Material): MaterialFormValues {
  return {
    name: material?.name ?? "",
    type: material?.type ?? "filamento",
    unit: material?.unit ?? "",
    referenceCost: material?.referenceCost ?? 0,
  };
}

export function MaterialForm({ material }: MaterialFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof materialFormSchema>, unknown, MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: defaultValues(material),
  });

  const materialType = form.watch("type");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(defaultValues(material));
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: MaterialFormValues) {
    const result = material
      ? await updateMaterialAction(material.id, values)
      : await createMaterialAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o insumo.");
      return;
    }

    toast.success(material ? "Insumo atualizado." : "Insumo cadastrado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant={material ? "outline" : "default"}>
          {material ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {material ? "Editar" : "Novo insumo"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Editar insumo" : "Cadastrar insumo"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MATERIAL_TYPE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  {/* Filamento é restrito a kg/g (o custo por kg precisa ser
                      resolvível e o saldo de estoque é canônico em gramas);
                      demais insumos aceitam unidade livre. */}
                  {materialType === "filamento" ? (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="kg ou g" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FILAMENT_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <FormControl>
                      <Input {...field} placeholder="Ex.: unidade, rolo" />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo de referência (R$/unidade)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {material ? "Salvar alterações" : "Cadastrar insumo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
