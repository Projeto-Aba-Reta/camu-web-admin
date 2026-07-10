"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { roleFormSchema, type RoleFormValues } from "@/lib/validation/role-schemas";
import { slugify } from "@/lib/utils";
import { createRoleAction, updateRoleAction } from "@/app/(dashboard)/admin/roles/actions";
import type { Role } from "@/types/auth";

interface RoleFormProps {
  mode: "create" | "edit";
  role?: Role;
  trigger: ReactNode;
}

export function RoleForm({ mode, role, trigger }: RoleFormProps) {
  const [open, setOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const router = useRouter();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? "",
      slug: role?.slug ?? "",
      description: role?.description ?? "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        name: role?.name ?? "",
        slug: role?.slug ?? "",
        description: role?.description ?? "",
      });
      setSlugTouched(mode === "edit");
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: RoleFormValues) {
    const result =
      mode === "create"
        ? await createRoleAction(values)
        : await updateRoleAction({ id: role!.id, ...values });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a role.");
      return;
    }

    toast.success(mode === "create" ? "Role criada." : "Role atualizada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova role" : "Editar role"}</DialogTitle>
          <DialogDescription>
            Roles representam áreas de negócio (ex.: Financeiro, Produção).
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
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!slugTouched) {
                          form.setValue("slug", slugify(e.target.value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        setSlugTouched(true);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {mode === "create" ? "Criar role" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
