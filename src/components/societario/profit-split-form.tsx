"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { History, Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  profitSplitFormSchema,
  type ProfitSplitFormValues,
} from "@/lib/validation/governance-schemas";
import { recordPartnershipAgreementAction } from "@/app/(dashboard)/societario/actions";
import { formatDate } from "@/lib/utils";
import type { PartnershipAgreement } from "@/types/governance";

interface ProfitSplitFormProps {
  current: PartnershipAgreement | null;
  history: PartnershipAgreement[];
}

export function ProfitSplitForm({ current, history }: ProfitSplitFormProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const router = useRouter();

  const form = useForm<ProfitSplitFormValues>({
    resolver: zodResolver(profitSplitFormSchema),
    defaultValues: {
      profitSplitRule: current?.profitSplitRule ?? "",
      exitTerms: current?.exitTerms ?? "",
    },
  });

  function handleEditOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        profitSplitRule: current?.profitSplitRule ?? "",
        exitTerms: current?.exitTerms ?? "",
      });
    }
    setEditOpen(nextOpen);
  }

  async function onSubmit(values: ProfitSplitFormValues) {
    const result = await recordPartnershipAgreementAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a regra de divisão de lucro.");
      return;
    }

    toast.success("Regra de divisão de lucro atualizada.");
    setEditOpen(false);
    router.refresh();
  }

  const previousHistory = history.filter((entry) => entry.id !== current?.id);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Regra de divisão de lucro</h2>
          <p className="text-sm text-muted-foreground">
            Regra e condições de saída vigentes, com histórico de mudanças.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="size-4" />
                Histórico
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Histórico da regra de divisão de lucro</DialogTitle>
                <DialogDescription>Versões anteriores, mais recente primeiro.</DialogDescription>
              </DialogHeader>
              <div className="max-h-96 space-y-4 overflow-y-auto">
                {previousHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma versão anterior registrada.</p>
                ) : (
                  previousHistory.map((entry) => (
                    <div key={entry.id} className="rounded-md border p-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        Vigente a partir de {formatDate(entry.validFrom)}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{entry.profitSplitRule}</p>
                      {entry.exitTerms && (
                        <p className="mt-1 text-muted-foreground">{entry.exitTerms}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="size-4" />
                Atualizar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atualizar regra de divisão de lucro</DialogTitle>
                <DialogDescription>
                  A alteração cria uma nova versão; a versão anterior é preservada no histórico.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="profitSplitRule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regra de divisão de lucro</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="exitTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condições de saída (opcional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      Salvar nova versão
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border p-4">
        {current ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">
              Vigente desde {formatDate(current.validFrom)}
            </p>
            <p className="whitespace-pre-wrap text-foreground">{current.profitSplitRule}</p>
            {current.exitTerms && (
              <div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">Condições de saída</p>
                <p className="whitespace-pre-wrap text-foreground">{current.exitTerms}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma regra registrada ainda.</p>
        )}
      </div>
    </section>
  );
}
