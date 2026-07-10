"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  revenueSnapshotFormSchema,
  type RevenueSnapshotFormValues,
} from "@/lib/validation/governance-schemas";
import {
  recordRevenueSnapshotAction,
  updateRevenueSnapshotAction,
} from "@/app/(dashboard)/societario/actions";
import { cn, formatCurrency } from "@/lib/utils";
import type { RevenueSnapshot } from "@/types/governance";

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function toMonthInputValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function last12MonthsWindow(): string[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - index, 1));
    return toMonthInputValue(date);
  });
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return MONTH_FORMATTER.format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

interface RevenueSnapshotFormProps {
  snapshots: RevenueSnapshot[];
}

export function RevenueSnapshotForm({ snapshots }: RevenueSnapshotFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const snapshotByMonth = useMemo(() => {
    const map = new Map<string, RevenueSnapshot>();
    for (const snapshot of snapshots) {
      map.set(snapshot.referenceMonth.slice(0, 7), snapshot);
    }
    return map;
  }, [snapshots]);

  const windowMonths = useMemo(() => last12MonthsWindow(), []);

  const form = useForm<RevenueSnapshotFormValues>({
    resolver: zodResolver(revenueSnapshotFormSchema),
    defaultValues: { referenceMonth: "", monthlyRevenue: 0, notes: "" },
  });

  const selectedMonth = form.watch("referenceMonth");
  const existingForSelectedMonth = selectedMonth ? snapshotByMonth.get(selectedMonth) : undefined;

  function openDialogForMonth(month: string) {
    const existing = snapshotByMonth.get(month);
    form.reset({
      referenceMonth: month,
      monthlyRevenue: existing?.monthlyRevenue ?? 0,
      notes: existing?.notes ?? "",
    });
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ referenceMonth: toMonthInputValue(new Date()), monthlyRevenue: 0, notes: "" });
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: RevenueSnapshotFormValues) {
    const existing = snapshotByMonth.get(values.referenceMonth);
    const result = existing
      ? await updateRevenueSnapshotAction(values)
      : await recordRevenueSnapshotAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o lançamento de faturamento.");
      return;
    }

    toast.success(existing ? "Lançamento atualizado." : "Lançamento registrado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Lançamentos mensais</h2>
          <p className="text-sm text-muted-foreground">
            Últimos 12 meses de referência, com destaque para meses sem lançamento.
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Registrar lançamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {existingForSelectedMonth ? "Atualizar lançamento" : "Registrar lançamento mensal"}
              </DialogTitle>
              <DialogDescription>
                {existingForSelectedMonth
                  ? "Já existe um lançamento para este mês — salvar irá atualizá-lo."
                  : "Informe o faturamento acumulado do mês de referência."}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="referenceMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês de referência</FormLabel>
                      <FormControl>
                        <Input type="month" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyRevenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faturamento do mês (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {existingForSelectedMonth ? "Atualizar lançamento" : "Registrar lançamento"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês de referência</TableHead>
              <TableHead>Faturamento</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {windowMonths.map((month) => {
              const snapshot = snapshotByMonth.get(month);
              const isMissing = !snapshot;
              return (
                <TableRow key={month} className={cn(isMissing && "bg-destructive/5")}>
                  <TableCell className="capitalize">{formatMonthLabel(month)}</TableCell>
                  <TableCell>
                    {snapshot ? (
                      formatCurrency(snapshot.monthlyRevenue)
                    ) : (
                      <span className="font-medium text-destructive">Sem lançamento</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{snapshot?.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openDialogForMonth(month)}>
                      {snapshot ? "Editar" : "Lançar"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
