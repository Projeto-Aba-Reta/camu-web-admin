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
import { b2bPricingTierFormSchema, type B2bPricingTierFormValues } from "@/lib/validation/pricing-schemas";
import { createB2bPricingTierAction } from "@/app/(dashboard)/financeiro/precificacao/actions";
import { useB2bTierDraft } from "@/components/precificacao/pricing-draft-context";
import type { B2bPricingTier } from "@/types/pricing";

interface B2bTierFormProps {
  current: B2bPricingTier[];
  canWrite: boolean;
}

export function B2bTierForm({ current, canWrite }: B2bTierFormProps) {
  const router = useRouter();
  const publishDraft = useB2bTierDraft();

  const form = useForm<z.input<typeof b2bPricingTierFormSchema>, unknown, B2bPricingTierFormValues>({
    resolver: zodResolver(b2bPricingTierFormSchema),
    defaultValues: { minQuantity: 0, targetMarginPctPercent: 0 },
  });

  // Publica no rascunho o que está digitado, sem salvar (ver design.md,
  // Decisão 5).
  const watched = form.watch();
  useEffect(() => {
    publishDraft({
      minQuantity: Number(watched.minQuantity) || 0,
      targetMarginPct: (Number(watched.targetMarginPctPercent) || 0) / 100,
    });
  }, [publishDraft, watched.minQuantity, watched.targetMarginPctPercent]);

  async function onSubmit(values: B2bPricingTierFormValues) {
    const result = await createB2bPricingTierAction({
      minQuantity: values.minQuantity,
      targetMarginPct: values.targetMarginPctPercent / 100,
    });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a faixa B2B.");
      return;
    }
    toast.success("Faixa B2B atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade mínima</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} value={field.value as number | string} />
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
                    <FormLabel>Margem-alvo B2B (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
              Atualizar (cria novo registro, o anterior fica no histórico)
            </Button>
          </fieldset>
        </form>
      </Form>
      {!canWrite && (
        <p className="text-xs text-muted-foreground">
          Você não tem permissão para alterar faixas de precificação B2B.
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quantidade mínima</TableHead>
              <TableHead>Margem-alvo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.length ? (
              current.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.minQuantity}+ un.</TableCell>
                  <TableCell>{(tier.targetMarginPct * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                  Nenhuma faixa B2B cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function B2bTierHistoryTable({ history }: { history: B2bPricingTier[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Quantidade mínima</TableHead>
            <TableHead>Margem-alvo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length ? (
            history.map((tier) => (
              <TableRow key={tier.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(tier.validFrom).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{tier.minQuantity}+ un.</TableCell>
                <TableCell>{(tier.targetMarginPct * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                Nenhum histórico ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
