"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stageColorClass } from "@/components/vendas/labels";
import { stageFormSchema, type StageFormValues } from "@/lib/validation/vendas-schemas";
import { createStageAction, updateStageAction } from "@/app/(dashboard)/vendas/actions";
import { STAGE_COLORS, type OrderPipelineStage, type StageColor } from "@/types/vendas";
import { cn } from "@/lib/utils";

interface PipelineStageFormProps {
  // Ausente = criação (nasce no fim da lista). Presente = edição.
  stage?: OrderPipelineStage;
}

export function PipelineStageForm({ stage }: PipelineStageFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = stage !== undefined;

  const defaults: StageFormValues = {
    name: stage?.name ?? "",
    color: (stage?.color as StageColor) ?? "slate",
    requiresPrinter: stage?.requiresPrinter ?? false,
  };

  const form = useForm<StageFormValues>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: defaults,
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) form.reset(defaults);
    setOpen(nextOpen);
  }

  async function onSubmit(values: StageFormValues) {
    const result = isEditing
      ? await updateStageAction(stage.id, values)
      : await createStageAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a etapa.");
      return;
    }

    toast.success(isEditing ? "Etapa atualizada." : "Etapa criada no fim do funil.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-4" />
            Nova etapa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Renomear não move nenhum pedido: quem estava nesta coluna continua nela."
              : "A etapa nasce no fim do funil; use as setas na lista para posicioná-la."}
          </DialogDescription>
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
                    <Input placeholder="ex.: Aguardando revisão" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STAGE_COLORS.map((color) => (
                        <SelectItem key={color} value={color}>
                          <span
                            className={cn("rounded px-1.5 py-0.5 text-xs", stageColorClass(color))}
                          >
                            {color}
                          </span>
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
              name="requiresPrinter"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div>
                    <FormLabel>Exige impressora</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Mover um pedido para esta etapa pergunta em qual impressora do parque ele
                      está.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? "Salvar" : "Criar etapa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
