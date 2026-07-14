"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOCIAL_CHANNEL_LABEL } from "@/components/marketing/labels";
import { NONE_OPTION, planItemFormSchema, type PlanItemFormValues } from "@/lib/validation/marketing-schemas";
import {
  createPlanItemAction,
  updatePlanItemAction,
  type PlanItemActionInput,
} from "@/app/(dashboard)/marketing/calendario/actions";
import { SOCIAL_CHANNELS, type CommemorativeDate, type SocialContentPlanItem } from "@/types/marketing";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface PlanItemFormProps {
  commemorativeDates: CommemorativeDate[];
  profiles: Profile[];
  // Ausente = criação. Presente = edição do item (o status não é editável
  // aqui: só muda pelo botão de avançar, que valida a sequência do funil).
  item?: SocialContentPlanItem;
}

function toFormValues(item: SocialContentPlanItem | undefined): PlanItemFormValues {
  return {
    title: item?.title ?? "",
    channels: item?.channels ?? [],
    commemorativeDateId: item?.commemorativeDateId ?? NONE_OPTION,
    responsibleId: item?.responsibleId ?? NONE_OPTION,
    targetDate: item?.targetDate ?? "",
    notes: item?.notes ?? "",
  };
}

function toActionInput(values: PlanItemFormValues): PlanItemActionInput {
  return {
    title: values.title,
    channels: values.channels,
    commemorativeDateId: values.commemorativeDateId === NONE_OPTION ? null : values.commemorativeDateId,
    responsibleId: values.responsibleId === NONE_OPTION ? null : values.responsibleId,
    targetDate: values.targetDate === "" ? null : values.targetDate,
    notes: values.notes.trim() === "" ? null : values.notes.trim(),
  };
}

export function PlanItemForm({ commemorativeDates, profiles, item }: PlanItemFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isEditing = item !== undefined;

  const form = useForm<PlanItemFormValues>({
    resolver: zodResolver(planItemFormSchema),
    defaultValues: toFormValues(item),
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(toFormValues(item));
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: PlanItemFormValues) {
    const input = toActionInput(values);
    const result = isEditing ? await updatePlanItemAction(item.id, input) : await createPlanItemAction(input);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o item de planejamento.");
      return;
    }

    toast.success(isEditing ? "Item atualizado." : "Item criado com status Ideia.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-4" />
            Novo post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar post" : "Novo post"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "O status não é editado aqui — use o botão de avançar no board para mover o item pelo funil."
              : "O post nasce no status Ideia e avança pelo funil no board. O vínculo com uma data comemorativa é opcional."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Vídeo de unboxing de Natal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channels"
              render={({ field }) => {
                const allSelected = field.value.length === SOCIAL_CHANNELS.length;

                return (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Canais</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.onChange(allSelected ? [] : [...SOCIAL_CHANNELS])}
                      >
                        {allSelected ? "Limpar seleção" : "Todas as redes"}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {SOCIAL_CHANNELS.map((channel) => (
                        <label
                          key={channel}
                          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={field.value.includes(channel)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked
                                  ? [...field.value, channel]
                                  : field.value.filter((selected) => selected !== channel),
                              )
                            }
                          />
                          {SOCIAL_CHANNEL_LABEL[channel]}
                        </label>
                      ))}
                    </div>

                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="commemorativeDateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data comemorativa (opcional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_OPTION}>Nenhuma</SelectItem>
                      {commemorativeDates.map((date) => (
                        <SelectItem key={date.id} value={date.id}>
                          {date.name}
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
              name="responsibleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável (opcional)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_OPTION}>Ninguém</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.fullName ?? profile.email}
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
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data alvo (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Textarea rows={3} placeholder="Roteiro, referências, trilha..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? "Salvar alterações" : "Criar post"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
