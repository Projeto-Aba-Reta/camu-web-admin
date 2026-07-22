"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { costParametersFormSchema, type CostParametersFormValues } from "@/lib/validation/pricing-schemas";
import { createCostParametersAction } from "@/app/(dashboard)/financeiro/precificacao/actions";
import { useCostParametersDraft } from "@/components/precificacao/pricing-draft-context";
import type { CostParameters } from "@/types/pricing";

interface ParametrosFormProps {
  current: CostParameters | null;
  canWrite: boolean;
}

export function ParametrosForm({ current, canWrite }: ParametrosFormProps) {
  const router = useRouter();
  const publishDraft = useCostParametersDraft();

  const form = useForm<z.input<typeof costParametersFormSchema>, unknown, CostParametersFormValues>({
    resolver: zodResolver(costParametersFormSchema),
    defaultValues: {
      filamentCostPerKg: current?.filamentCostPerKg ?? 0,
      energyCostPerKwh: current?.energyCostPerKwh ?? 0,
      averagePowerWatts: current?.averagePowerWatts ?? 0,
      failureReservePctPercent: current ? current.failureReservePct * 100 : 0,
      packagingCost: current?.packagingCost ?? 0,
      targetMarginPctPercent: current ? current.targetMarginPct * 100 : 0,
    },
  });

  // Publica no rascunho o que está digitado, sem salvar — o simulador projeta
  // o "se salvar" a partir daqui (ver design.md, Decisão 5).
  const watched = form.watch();
  useEffect(() => {
    publishDraft({
      filamentCostPerKg: Number(watched.filamentCostPerKg) || 0,
      energyCostPerKwh: Number(watched.energyCostPerKwh) || 0,
      averagePowerWatts: Number(watched.averagePowerWatts) || 0,
      failureReservePct: (Number(watched.failureReservePctPercent) || 0) / 100,
      packagingCost: Number(watched.packagingCost) || 0,
      targetMarginPct: (Number(watched.targetMarginPctPercent) || 0) / 100,
    });
  }, [
    publishDraft,
    watched.filamentCostPerKg,
    watched.energyCostPerKwh,
    watched.averagePowerWatts,
    watched.failureReservePctPercent,
    watched.packagingCost,
    watched.targetMarginPctPercent,
  ]);

  async function onSubmit(values: CostParametersFormValues) {
    const result = await createCostParametersAction({
      filamentCostPerKg: values.filamentCostPerKg,
      energyCostPerKwh: values.energyCostPerKwh,
      averagePowerWatts: values.averagePowerWatts,
      failureReservePct: values.failureReservePctPercent / 100,
      packagingCost: values.packagingCost,
      targetMarginPct: values.targetMarginPctPercent / 100,
    });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar os parâmetros de custo.");
      return;
    }

    toast.success("Parâmetros de custo atualizados.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
            <FormField
              control={form.control}
              name="filamentCostPerKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filamento (R$/kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="energyCostPerKwh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energia (R$/kWh)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="averagePowerWatts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo médio (W)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="failureReservePctPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reserva de falha (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="packagingCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embalagem (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetMarginPctPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Margem-alvo B2C (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
              Atualizar (cria novo registro, o anterior fica no histórico)
            </Button>
          </fieldset>
        </form>
      </Form>
      {!canWrite && (
        <p className="text-xs text-muted-foreground">
          Você não tem permissão para alterar parâmetros de custo.
        </p>
      )}
    </div>
  );
}

export function ParametrosHistoryTable({ history }: { history: CostParameters[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Filamento</TableHead>
            <TableHead>Energia</TableHead>
            <TableHead>Consumo</TableHead>
            <TableHead>Reserva</TableHead>
            <TableHead>Embalagem</TableHead>
            <TableHead>Margem-alvo B2C</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length ? (
            history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.validFrom).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>R$ {entry.filamentCostPerKg.toFixed(2)}/kg</TableCell>
                <TableCell>R$ {entry.energyCostPerKwh.toFixed(2)}/kWh</TableCell>
                <TableCell>{entry.averagePowerWatts}W</TableCell>
                <TableCell>{(entry.failureReservePct * 100).toFixed(1)}%</TableCell>
                <TableCell>R$ {entry.packagingCost.toFixed(2)}</TableCell>
                <TableCell>{(entry.targetMarginPct * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                Nenhum parâmetro cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
