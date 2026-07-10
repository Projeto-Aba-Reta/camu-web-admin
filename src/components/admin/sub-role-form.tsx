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
import { createSubRoleAction, updateSubRoleAction } from "@/app/(dashboard)/admin/roles/actions";
import type { SubRole } from "@/types/auth";

interface SubRoleFormProps {
  mode: "create" | "edit";
  roleId: string;
  subRole?: SubRole;
  trigger: ReactNode;
}

export function SubRoleForm({ mode, roleId, subRole, trigger }: SubRoleFormProps) {
  const [open, setOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const router = useRouter();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: subRole?.name ?? "",
      slug: subRole?.slug ?? "",
      description: subRole?.description ?? "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        name: subRole?.name ?? "",
        slug: subRole?.slug ?? "",
        description: subRole?.description ?? "",
      });
      setSlugTouched(mode === "edit");
    }
    setOpen(nextOpen);
  }

  async function onSubmit(values: RoleFormValues) {
    const result =
      mode === "create"
        ? await createSubRoleAction({ roleId, ...values })
        : await updateSubRoleAction({ id: subRole!.id, roleId, ...values });

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar a sub-role.");
      return;
    }

    toast.success(mode === "create" ? "Sub-role criada." : "Sub-role atualizada.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova sub-role" : "Editar sub-role"}</DialogTitle>
          <DialogDescription>
            Sub-roles refinam o acesso dentro de uma role (ex.: &quot;Visualizar&quot;,
            &quot;Editar&quot;).
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
                {mode === "create" ? "Criar sub-role" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
