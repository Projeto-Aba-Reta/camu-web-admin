"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { printerFormSchema, type PrinterFormValues } from "@/lib/validation/pricing-schemas";
import { createPrinterAction, setPrinterActiveAction } from "@/app/(dashboard)/financeiro/precificacao/actions";
import type { Printer } from "@/types/pricing";

interface ImpressoraFormProps {
  // Todas as versões de todas as impressoras, ordenadas por nome e por
  // vigência decrescente (ver IPrinterRepository.findAll).
  allVersions: Printer[];
  canWrite: boolean;
}

export function ImpressoraForm({ allVersions, canWrite }: ImpressoraFormProps) {
  const router = useRouter();

  const current = useMemo(() => {
    const seen = new Set<string>();
    const result: Printer[] = [];
    for (const printer of allVersions) {
      if (seen.has(printer.name)) continue;
      seen.add(printer.name);
      result.push(printer);
    }
    return result;
  }, [allVersions]);

  const form = useForm<z.input<typeof printerFormSchema>, unknown, PrinterFormValues>({
    resolver: zodResolver(printerFormSchema),
    defaultValues: { name: "", model: "", depreciationPerHour: 0 },
  });

  async function onSubmit(values: PrinterFormValues) {
    const result = await createPrinterAction(values);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível cadastrar a impressora.");
      return;
    }
    toast.success("Impressora cadastrada.");
    form.reset({ name: "", model: "", depreciationPerHour: 0 });
    router.refresh();
  }

  async function onToggleActive(printer: Printer, isActive: boolean) {
    const result = await setPrinterActiveAction(printer.id, isActive);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível alterar o status da impressora.");
      return;
    }
    toast.success(isActive ? "Impressora ativada." : "Impressora desativada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
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
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depreciationPerHour"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depreciação (R$/hora)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
              Cadastrar impressora
            </Button>
          </fieldset>
        </form>
      </Form>
      {!canWrite && (
        <p className="text-xs text-muted-foreground">
          Você não tem permissão para alterar o parque de impressoras.
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Depreciação/h</TableHead>
              <TableHead>Ativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.length ? (
              current.map((printer) => (
                <TableRow key={printer.id}>
                  <TableCell className="font-medium">{printer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{printer.model}</TableCell>
                  <TableCell>R$ {printer.depreciationPerHour.toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={printer.isActive}
                      disabled={!canWrite}
                      onCheckedChange={(checked) => onToggleActive(printer, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  Nenhuma impressora cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ImpressoraHistoryTable({ allVersions }: { allVersions: Printer[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Depreciação/h</TableHead>
            <TableHead>Ativa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allVersions.length ? (
            allVersions.map((printer) => (
              <TableRow key={printer.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(printer.validFrom).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{printer.name}</TableCell>
                <TableCell>R$ {printer.depreciationPerHour.toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {printer.isActive ? "Sim" : "Não"}
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
