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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  capitalContributionFormSchema,
  type CapitalContributionFormValues,
} from "@/lib/validation/governance-schemas";
import { recordCapitalContributionAction } from "@/app/(dashboard)/societario/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CapitalContribution } from "@/types/governance";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface CapitalContributionFormProps {
  contributions: CapitalContribution[];
  partners: Profile[];
}

export function CapitalContributionForm({ contributions, partners }: CapitalContributionFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const partnerById = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [
    partners,
  ]);

  const groups = useMemo(() => {
    const byPartner = new Map<string, CapitalContribution[]>();
    for (const contribution of contributions) {
      const list = byPartner.get(contribution.partnerProfileId) ?? [];
      list.push(contribution);
      byPartner.set(contribution.partnerProfileId, list);
    }
    return Array.from(byPartner.entries()).map(([partnerProfileId, items]) => ({
      partnerProfileId,
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    }));
  }, [contributions]);

  const form = useForm<CapitalContributionFormValues>({
    resolver: zodResolver(capitalContributionFormSchema),
    defaultValues: {
      partnerProfileId: "",
      amount: 0,
      contributionDate: "",
      proofReference: "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({ partnerProfileId: "", amount: 0, contributionDate: "", proofReference: "" });
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: CapitalContributionFormValues) {
    const result = await recordCapitalContributionAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível registrar a contribuição de capital.");
      return;
    }

    toast.success("Contribuição de capital registrada.");
    setOpen(false);
    router.refresh();
  }

  function partnerLabel(partnerProfileId: string): string {
    const partner = partnerById.get(partnerProfileId);
    return partner ? (partner.fullName ?? partner.email) : "Sócio não encontrado";
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contribuições de capital</h2>
          <p className="text-sm text-muted-foreground">
            Aportes por sócio, com valor, data e referência de comprovante.
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Registrar aporte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar novo aporte de capital</DialogTitle>
              <DialogDescription>
                Aportes já registrados não podem ser editados por esta tela.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="partnerProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sócio</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione um sócio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {partners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.fullName ?? partner.email}
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
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
                  name="contributionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do aporte</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proofReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referência do comprovante (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex.: comprovante-pix-2026-07.pdf" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Registrar aporte
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma contribuição registrada ainda.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.partnerProfileId} className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{partnerLabel(group.partnerProfileId)}</p>
                <p className="text-sm font-medium text-foreground">{formatCurrency(group.total)}</p>
              </div>
              <div className="mt-3 divide-y">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="text-foreground">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.contributionDate)}
                        {item.proofReference ? ` · ${item.proofReference}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
