"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MoveRight } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveOrderFormSchema, type MoveOrderFormValues } from "@/lib/validation/vendas-schemas";
import { moveSalesOrderAction } from "@/app/(dashboard)/vendas/actions";
import type { OrderPipelineStage, SalesOrderWithFinancials } from "@/types/vendas";
import type { Printer } from "@/types/pricing";

interface MoveOrderDialogProps {
  order: SalesOrderWithFinancials;
  // Só etapas ativas: mover para etapa arquivada é recusado no servidor.
  stages: OrderPipelineStage[];
  activePrinters: Printer[];
  // Quando informada, o destino já vem escolhido e o seletor de etapa some —
  // é o caso dos botões de avançar/voltar uma etapa. A nota continua
  // disponível: mover sem poder registrar o porquê perde o histórico.
  fixedStage?: OrderPipelineStage;
  direction?: "avancar" | "voltar";
}

export function MoveOrderDialog({
  order,
  stages,
  activePrinters,
  fixedStage,
  direction,
}: MoveOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const defaults = { toStageId: fixedStage?.id ?? "", printerId: "", note: "" };

  const form = useForm<MoveOrderFormValues>({
    resolver: zodResolver(moveOrderFormSchema),
    defaultValues: defaults,
  });

  const toStageId = form.watch("toStageId");
  const targetStage = stages.find((stage) => stage.id === toStageId) ?? fixedStage;
  const needsPrinter = targetStage?.requiresPrinter ?? false;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) form.reset(defaults);
    setOpen(nextOpen);
  }

  async function onSubmit(values: MoveOrderFormValues) {
    // A exigência depende da etapa escolhida, que o schema estático não
    // conhece — o servidor recusa de qualquer forma.
    if (needsPrinter && !values.printerId) {
      form.setError("printerId", {
        message: `A etapa "${targetStage?.name}" exige informar em qual impressora o pedido está.`,
      });
      return;
    }

    const result = await moveSalesOrderAction({
      orderId: order.id,
      toStageId: values.toStageId,
      printerId: needsPrinter ? values.printerId : null,
      note: values.note.trim() === "" ? null : values.note.trim(),
    });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível mover o pedido.");
      return;
    }

    toast.success(`Pedido movido para "${targetStage?.name}".`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {fixedStage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2"
            title={`${direction === "voltar" ? "Voltar para" : "Avançar para"} "${fixedStage.name}"`}
          >
            {direction === "voltar" ? (
              <ChevronLeft className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <span className="sr-only">
              {direction === "voltar" ? "Voltar para" : "Avançar para"} {fixedStage.name}
            </span>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm">
            <MoveRight className="size-4" />
            Mover
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {fixedStage
              ? `${direction === "voltar" ? "Voltar" : "Avançar"} ${order.orderCode} para "${fixedStage.name}"`
              : `Mover ${order.orderCode}`}
          </DialogTitle>
          <DialogDescription>
            {fixedStage
              ? "Uma etapa por vez, na ordem do funil. A nota é opcional e fica no histórico do pedido."
              : "A movimentação é livre — para frente ou para trás. Voltar um pedido por reimpressão é esperado, e cada passagem fica registrada no histórico."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Destino fixo dispensa o seletor: o botão já disse para onde vai. */}
            {!fixedStage && (
              <FormField
                control={form.control}
                name="toStageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mover para</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages
                          .filter((stage) => stage.id !== order.stageId)
                          .map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {needsPrinter && (
              <FormField
                control={form.control}
                name="printerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Em qual impressora</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a impressora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activePrinters.map((printer) => (
                          <SelectItem key={printer.id} value={printer.id}>
                            {printer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ex.: peça saiu com defeito" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Mover pedido
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
