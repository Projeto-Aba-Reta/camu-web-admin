"use client";

import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  legalStatusFormSchema,
  type LegalStatusFormValues,
} from "@/lib/validation/governance-schemas";
import { recordLegalEntityStatusAction } from "@/app/(dashboard)/societario/actions";
import { formatDate } from "@/lib/utils";
import type { LegalEntityStatus } from "@/types/governance";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

const ENTITY_TYPE_LABEL: Record<LegalEntityStatus["entityType"], string> = {
  mei: "MEI",
  me: "ME (Sociedade Limitada)",
};

interface LegalStatusFormProps {
  current: LegalEntityStatus | null;
  history: LegalEntityStatus[];
  partners: Profile[];
}

export function LegalStatusForm({ current, history, partners }: LegalStatusFormProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const router = useRouter();

  const partnerById = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [
    partners,
  ]);

  function titularLabel(titularProfileId: string | null): string | null {
    if (!titularProfileId) return null;
    const partner = partnerById.get(titularProfileId);
    return partner ? (partner.fullName ?? partner.email) : "Sócio não encontrado";
  }

  const form = useForm<LegalStatusFormValues>({
    resolver: zodResolver(legalStatusFormSchema),
    defaultValues: {
      entityType: current?.entityType ?? "mei",
      cnpj: current?.cnpj ?? "",
      titularProfileId: current?.titularProfileId ?? "",
    },
  });

  const entityType = form.watch("entityType");

  function handleEditOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        entityType: current?.entityType ?? "mei",
        cnpj: current?.cnpj ?? "",
        titularProfileId: current?.titularProfileId ?? "",
      });
    }
    setEditOpen(nextOpen);
  }

  async function onSubmit(values: LegalStatusFormValues) {
    const result = await recordLegalEntityStatusAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível registrar o enquadramento jurídico.");
      return;
    }

    toast.success("Enquadramento jurídico atualizado.");
    setEditOpen(false);
    router.refresh();
  }

  const previousHistory = history.filter((entry) => entry.id !== current?.id);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Enquadramento jurídico</h2>
          <p className="text-sm text-muted-foreground">
            Tipo de PJ vigente, CNPJ e titular, com histórico de mudanças.
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
                <DialogTitle>Histórico de enquadramento</DialogTitle>
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
                      <p className="mt-1 font-medium text-foreground">
                        {ENTITY_TYPE_LABEL[entry.entityType]}
                      </p>
                      {entry.cnpj && <p className="text-muted-foreground">CNPJ: {entry.cnpj}</p>}
                      {titularLabel(entry.titularProfileId) && (
                        <p className="text-muted-foreground">
                          Titular: {titularLabel(entry.titularProfileId)}
                        </p>
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
                Registrar migração
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar migração de enquadramento</DialogTitle>
                <DialogDescription>
                  Cria um novo registro versionado, mantendo o atual visível no histórico.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de PJ</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mei">MEI</SelectItem>
                            <SelectItem value="me">ME (Sociedade Limitada)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00.000.000/0001-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {entityType === "mei" && (
                    <FormField
                      control={form.control}
                      name="titularProfileId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titular</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o titular do MEI" />
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
                  )}

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
          <div className="space-y-1 text-sm">
            <p className="text-xs text-muted-foreground">
              Vigente desde {formatDate(current.validFrom)}
            </p>
            <p className="font-medium text-foreground">{ENTITY_TYPE_LABEL[current.entityType]}</p>
            {current.cnpj && <p className="text-muted-foreground">CNPJ: {current.cnpj}</p>}
            {titularLabel(current.titularProfileId) && (
              <p className="text-muted-foreground">
                Titular: {titularLabel(current.titularProfileId)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum enquadramento registrado ainda.</p>
        )}
      </div>
    </section>
  );
}
