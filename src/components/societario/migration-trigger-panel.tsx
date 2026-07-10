"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  migrationTriggerRevertFormSchema,
  type MigrationTriggerRevertFormValues,
} from "@/lib/validation/governance-schemas";
import { updateMigrationTriggerAction } from "@/app/(dashboard)/societario/actions";
import { formatDate } from "@/lib/utils";
import type { LegalMigrationTrigger, MigrationTriggerType } from "@/types/governance";

const TRIGGER_TYPES: MigrationTriggerType[] = [
  "faturamento_proximo_teto",
  "lancamento_assinatura_recorrente",
  "necessidade_mais_funcionarios",
  "investimento_externo",
];

const TRIGGER_LABEL: Record<MigrationTriggerType, string> = {
  faturamento_proximo_teto: "Faturamento próximo do teto do MEI",
  lancamento_assinatura_recorrente: "Lançamento da assinatura recorrente",
  necessidade_mais_funcionarios: "Necessidade de mais funcionários",
  investimento_externo: "Investimento externo",
};

interface MigrationTriggerPanelProps {
  triggers: LegalMigrationTrigger[];
}

export function MigrationTriggerPanel({ triggers }: MigrationTriggerPanelProps) {
  const triggerByType = new Map(triggers.map((trigger) => [trigger.triggerType, trigger]));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Gatilhos de migração</h2>
        <p className="text-sm text-muted-foreground">
          Status dos 4 gatilhos que indicam a migração de MEI para ME.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TRIGGER_TYPES.map((triggerType) => (
          <TriggerCard key={triggerType} triggerType={triggerType} trigger={triggerByType.get(triggerType) ?? null} />
        ))}
      </div>
    </section>
  );
}

function TriggerCard({
  triggerType,
  trigger,
}: {
  triggerType: MigrationTriggerType;
  trigger: LegalMigrationTrigger | null;
}) {
  const [revertOpen, setRevertOpen] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const router = useRouter();
  const status = trigger?.status ?? "pendente";

  const form = useForm<MigrationTriggerRevertFormValues>({
    resolver: zodResolver(migrationTriggerRevertFormSchema),
    defaultValues: { notes: "" },
  });

  function handleRevertOpenChange(nextOpen: boolean) {
    if (nextOpen) form.reset({ notes: "" });
    setRevertOpen(nextOpen);
  }

  async function handleMarkAsReached() {
    setIsMarking(true);
    const result = await updateMigrationTriggerAction(triggerType, "atingido");
    setIsMarking(false);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível marcar o gatilho como atingido.");
      return;
    }

    toast.success("Gatilho marcado como atingido.");
    router.refresh();
  }

  async function onRevertSubmit(values: MigrationTriggerRevertFormValues) {
    const result = await updateMigrationTriggerAction(triggerType, "pendente", values.notes);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível reverter o gatilho.");
      return;
    }

    toast.success("Gatilho revertido para pendente.");
    setRevertOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{TRIGGER_LABEL[triggerType]}</p>
        <Badge variant={status === "atingido" ? "default" : "secondary"}>
          {status === "atingido" ? "Atingido" : "Pendente"}
        </Badge>
      </div>

      {trigger?.reachedAt && (
        <p className="text-xs text-muted-foreground">Atingido em {formatDate(trigger.reachedAt)}</p>
      )}
      {trigger?.notes && <p className="text-xs text-muted-foreground">Nota: {trigger.notes}</p>}

      {status === "pendente" ? (
        <Button size="sm" variant="outline" disabled={isMarking} onClick={handleMarkAsReached}>
          Marcar como atingido
        </Button>
      ) : (
        <Dialog open={revertOpen} onOpenChange={handleRevertOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Reverter para pendente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reverter gatilho para pendente</DialogTitle>
              <DialogDescription>
                Explique o motivo da reversão — a nota é obrigatória.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onRevertSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Reverter
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
