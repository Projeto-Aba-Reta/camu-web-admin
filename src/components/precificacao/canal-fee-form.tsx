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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { channelFeeFormSchema, type ChannelFeeFormValues } from "@/lib/validation/pricing-schemas";
import { CHANNEL_LABEL } from "@/lib/pricing/channel-label";
import { createChannelFeeAction } from "@/app/(dashboard)/precificacao/actions";
import { useChannelFeeDraft } from "@/components/precificacao/pricing-draft-context";
import type { ChannelFee } from "@/types/pricing";

interface CanalFeeFormProps {
  current: ChannelFee[];
  canWrite: boolean;
}

export function CanalFeeForm({ current, canWrite }: CanalFeeFormProps) {
  const router = useRouter();
  const publishDraft = useChannelFeeDraft();

  const form = useForm<z.input<typeof channelFeeFormSchema>, unknown, ChannelFeeFormValues>({
    resolver: zodResolver(channelFeeFormSchema),
    defaultValues: { channel: "mercado_livre", percentageFeePercent: 0, fixedFee: 0 },
  });

  // Trocar de canal carrega a taxa vigente dele: sem isso, o rascunho
  // publicado abaixo zeraria a taxa do canal no simulador.
  const selectedChannel = form.watch("channel");
  const { reset } = form;
  useEffect(() => {
    const vigente = current.find((fee) => fee.channel === selectedChannel);
    if (!vigente) return;
    reset({
      channel: vigente.channel,
      percentageFeePercent: vigente.percentageFee * 100,
      fixedFee: vigente.fixedFee,
    });
  }, [selectedChannel, current, reset]);

  // Publica no rascunho o que está digitado, sem salvar (ver design.md,
  // Decisão 5).
  const watched = form.watch();
  useEffect(() => {
    if (!watched.channel) return;
    publishDraft({
      channel: watched.channel,
      percentageFee: (Number(watched.percentageFeePercent) || 0) / 100,
      fixedFee: Number(watched.fixedFee) || 0,
    });
  }, [publishDraft, watched.channel, watched.percentageFeePercent, watched.fixedFee]);

  async function onSubmit(values: ChannelFeeFormValues) {
    const result = await createChannelFeeAction({
      channel: values.channel,
      percentageFee: values.percentageFeePercent / 100,
      fixedFee: values.fixedFee,
    });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a taxa do canal.");
      return;
    }

    toast.success("Taxa de canal atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
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

            <FormField
              control={form.control}
              name="percentageFeePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa percentual (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fixedFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa fixa (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} value={field.value as number | string} />
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
          Você não tem permissão para alterar taxas de canal.
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Taxa %</TableHead>
              <TableHead>Taxa fixa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.length ? (
              current.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{CHANNEL_LABEL[fee.channel]}</TableCell>
                  <TableCell>{(fee.percentageFee * 100).toFixed(2)}%</TableCell>
                  <TableCell>R$ {fee.fixedFee.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  Nenhuma taxa cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CanalFeeHistoryTable({ history }: { history: ChannelFee[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Taxa %</TableHead>
            <TableHead>Taxa fixa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length ? (
            history.map((fee) => (
              <TableRow key={fee.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(fee.validFrom).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{CHANNEL_LABEL[fee.channel]}</TableCell>
                <TableCell>{(fee.percentageFee * 100).toFixed(2)}%</TableCell>
                <TableCell>R$ {fee.fixedFee.toFixed(2)}</TableCell>
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
