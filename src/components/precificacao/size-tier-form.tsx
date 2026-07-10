"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sizeTierRangeFormSchema, type SizeTierRangeFormValues } from "@/lib/validation/pricing-schemas";
import { createSizeTierRangeAction } from "@/app/(dashboard)/financeiro/precificacao/actions";
import type { SizeTierRange } from "@/types/pricing";

const TIER_LABEL: Record<string, string> = { P: "P (pequena)", M: "M (média)", G: "G (grande)" };

interface SizeTierFormProps {
  current: SizeTierRange[];
  canWrite: boolean;
}

export function SizeTierForm({ current, canWrite }: SizeTierFormProps) {
  const router = useRouter();

  const form = useForm<z.input<typeof sizeTierRangeFormSchema>, unknown, SizeTierRangeFormValues>({
    resolver: zodResolver(sizeTierRangeFormSchema),
    defaultValues: {
      tier: "P",
      minWeightGrams: 0,
      maxWeightGrams: 0,
      minPrintHours: 0,
      maxPrintHours: 0,
    },
  });

  async function onSubmit(values: SizeTierRangeFormValues) {
    const result = await createSizeTierRangeAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a faixa de porte.");
      return;
    }
    toast.success("Faixa de porte atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porte</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TIER_LABEL).map(([value, label]) => (
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="minWeightGrams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso mín. (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxWeightGrams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso máx. (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minPrintHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo mín. (h)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxPrintHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo máx. (h)</FormLabel>
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
          Você não tem permissão para alterar faixas de porte.
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Porte</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.length ? (
              current.map((range) => (
                <TableRow key={range.id}>
                  <TableCell className="font-medium">{TIER_LABEL[range.tier]}</TableCell>
                  <TableCell>
                    {range.minWeightGrams}g – {range.maxWeightGrams}g
                  </TableCell>
                  <TableCell>
                    {range.minPrintHours}h – {range.maxPrintHours}h
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  Nenhuma faixa cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SizeTierHistoryTable({ history }: { history: SizeTierRange[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Porte</TableHead>
            <TableHead>Peso</TableHead>
            <TableHead>Tempo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length ? (
            history.map((range) => (
              <TableRow key={range.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(range.validFrom).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{TIER_LABEL[range.tier]}</TableCell>
                <TableCell>
                  {range.minWeightGrams}g – {range.maxWeightGrams}g
                </TableCell>
                <TableCell>
                  {range.minPrintHours}h – {range.maxPrintHours}h
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                Nenhum histórico ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
