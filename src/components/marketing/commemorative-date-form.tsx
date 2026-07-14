"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { commemorativeDateFormSchema, type CommemorativeDateFormValues } from "@/lib/validation/marketing-schemas";
import { createCommemorativeDateAction } from "@/app/(dashboard)/marketing/calendario/actions";

const DEFAULT_VALUES: CommemorativeDateFormValues = {
  name: "",
  ruleType: "fixa",
  ruleValue: "",
  category: "",
};

export function CommemorativeDateForm() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<CommemorativeDateFormValues>({
    resolver: zodResolver(commemorativeDateFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const ruleType = form.watch("ruleType");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(DEFAULT_VALUES);
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: CommemorativeDateFormValues) {
    const result = await createCommemorativeDateAction(values);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível cadastrar a data comemorativa.");
      return;
    }

    toast.success("Data comemorativa cadastrada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CalendarPlus className="size-4" />
          Nova data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova data comemorativa</DialogTitle>
          <DialogDescription>
            Datas ficam ativas ao serem cadastradas e podem ser vinculadas a posts do planejamento de conteúdo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Natal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ruleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de regra</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixa">Fixa (repete todo ano)</SelectItem>
                      <SelectItem value="movel">Móvel (data muda a cada ano)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ruleValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input placeholder={ruleType === "fixa" ? "12-25" : "2026-11-27"} {...field} />
                  </FormControl>
                  <FormDescription>
                    {ruleType === "fixa"
                      ? "Formato MM-DD — cai no mesmo dia todo ano (ex. 12-25 para o Natal)."
                      : "Formato AAAA-MM-DD — a ocorrência deste ciclo (ex. 2026-11-27 para a Black Friday); atualize a cada ano."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Sazonal, comercial, nicho..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Cadastrar data
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
