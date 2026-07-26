"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { sizeTierRangeFormSchema, type SizeTierRangeFormValues } from "@/lib/validation/pricing-schemas";
import {
  createSizeTierAction,
  createSizeTierRangeAction,
  removeSizeTierAction,
  updateSizeTierAction,
} from "@/app/(dashboard)/precificacao/actions";
import { useSizeTierDraft } from "@/components/precificacao/pricing-draft-context";
import { tierLabel } from "@/lib/pricing/tier-label";
import type { MarginMode, SizeTierDefinition, SizeTierRange } from "@/types/pricing";

const MODE_LABEL: Record<MarginMode, string> = {
  somar: "Somar à margem-alvo",
  substituir: "Substituir a margem-alvo",
};

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1).replace(".", ",")}%`;
}

// Formulário em %, banco/motor em fração — mesma conversão de reserva de
// falha e taxa de canal.
function toFraction(percent: number): number {
  return percent / 100;
}

interface SizeTierFormProps {
  current: SizeTierRange[];
  tiers: SizeTierDefinition[];
  canWrite: boolean;
}

export function SizeTierForm({ current, tiers, canWrite }: SizeTierFormProps) {
  const router = useRouter();
  const publishDraft = useSizeTierDraft();

  const form = useForm<z.input<typeof sizeTierRangeFormSchema>, unknown, SizeTierRangeFormValues>({
    resolver: zodResolver(sizeTierRangeFormSchema),
    defaultValues: {
      tier: tiers[0]?.code ?? "",
      minWeightGrams: 0,
      maxWeightGrams: 0,
      minPrintHours: 0,
      maxPrintHours: 0,
      b2cMarginPctPercent: 0,
      b2cMarginMode: "somar",
      b2bMarginPctPercent: 0,
      b2bMarginMode: "somar",
    },
  });

  // Trocar o porte carrega os valores vigentes daquela faixa: sem isso, o
  // rascunho publicado abaixo zeraria a faixa e o simulador projetaria um
  // preço que ninguém pediu.
  const selectedTier = form.watch("tier");
  const { reset } = form;
  useEffect(() => {
    const vigente = current.find((range) => range.tier === selectedTier);
    if (!vigente) return;
    reset({
      tier: vigente.tier,
      minWeightGrams: vigente.minWeightGrams,
      maxWeightGrams: vigente.maxWeightGrams,
      minPrintHours: vigente.minPrintHours,
      maxPrintHours: vigente.maxPrintHours,
      b2cMarginPctPercent: vigente.b2cMarginPct * 100,
      b2cMarginMode: vigente.b2cMarginMode,
      b2bMarginPctPercent: vigente.b2bMarginPct * 100,
      b2bMarginMode: vigente.b2bMarginMode,
    });
  }, [selectedTier, current, reset]);

  // Publica no rascunho o que está sendo digitado, sem salvar: é isso que o
  // simulador projeta como "se salvar" (ver design.md, Decisão 5).
  const watched = form.watch();
  useEffect(() => {
    const tier = watched.tier;
    if (!tier) return;
    publishDraft({
      tier,
      minWeightGrams: Number(watched.minWeightGrams) || 0,
      maxWeightGrams: Number(watched.maxWeightGrams) || 0,
      minPrintHours: Number(watched.minPrintHours) || 0,
      maxPrintHours: Number(watched.maxPrintHours) || 0,
      b2cMarginPct: toFraction(Number(watched.b2cMarginPctPercent) || 0),
      b2cMarginMode: (watched.b2cMarginMode ?? "somar") as MarginMode,
      b2bMarginPct: toFraction(Number(watched.b2bMarginPctPercent) || 0),
      b2bMarginMode: (watched.b2bMarginMode ?? "somar") as MarginMode,
    });
  }, [
    publishDraft,
    watched.tier,
    watched.minWeightGrams,
    watched.maxWeightGrams,
    watched.minPrintHours,
    watched.maxPrintHours,
    watched.b2cMarginPctPercent,
    watched.b2cMarginMode,
    watched.b2bMarginPctPercent,
    watched.b2bMarginMode,
  ]);

  async function onSubmit(values: SizeTierRangeFormValues) {
    const result = await createSizeTierRangeAction({
      tier: values.tier,
      minWeightGrams: values.minWeightGrams,
      maxWeightGrams: values.maxWeightGrams,
      minPrintHours: values.minPrintHours,
      maxPrintHours: values.maxPrintHours,
      b2cMarginPct: toFraction(values.b2cMarginPctPercent),
      b2cMarginMode: values.b2cMarginMode,
      b2bMarginPct: toFraction(values.b2bMarginPctPercent),
      b2bMarginMode: values.b2bMarginMode,
    });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível atualizar a faixa de porte.");
      return;
    }
    toast.success("Faixa de porte atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <SizeTierManager tiers={tiers} canWrite={canWrite} />

      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">Faixa de peso/tempo e margens por porte</h4>
        <p className="text-xs text-muted-foreground">
          Escolha um porte para editar sua faixa de referência e suas margens. Cada atualização cria um novo registro
          versionado.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4">
            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porte</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.code} value={tier.code}>
                          {tier.label} ({tier.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="minWeightGrams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso mín. (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxWeightGrams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso máx. (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minPrintHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo mín. (h)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxPrintHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo máx. (h)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div>
                <h4 className="text-sm font-medium text-foreground">Margem de lucro deste porte</h4>
                <p className="text-xs text-muted-foreground">
                  <strong>Somar</strong> adiciona esta margem à margem-alvo (a global, no B2C; a da faixa de volume,
                  no B2B). <strong>Substituir</strong> faz a margem do porte valer sozinha, ignorando a margem-alvo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="b2cMarginPctPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margem B2C (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="b2cMarginMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modo B2C</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(MODE_LABEL) as MarginMode[]).map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {MODE_LABEL[mode]}
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
                  name="b2bMarginPctPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margem B2B (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value as number | string} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="b2bMarginMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modo B2B</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!canWrite}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(MODE_LABEL) as MarginMode[]).map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {MODE_LABEL[mode]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
              Atualizar (cria novo registro, o anterior fica no histórico)
            </Button>
          </fieldset>
        </form>
      </Form>
      {!canWrite && (
        <p className="text-xs text-muted-foreground">
          Você não tem permissão para alterar faixas de porte.
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Porte</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Margem B2C</TableHead>
              <TableHead>Margem B2B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {current.length ? (
              current.map((range) => (
                <TableRow key={range.id}>
                  <TableCell className="font-medium">{tierLabel(range.tier, tiers)}</TableCell>
                  <TableCell>
                    {range.minWeightGrams}g – {range.maxWeightGrams}g
                  </TableCell>
                  <TableCell>
                    {range.minPrintHours}h – {range.maxPrintHours}h
                  </TableCell>
                  <TableCell>
                    <MarginCell pct={range.b2cMarginPct} mode={range.b2cMarginMode} />
                  </TableCell>
                  <TableCell>
                    <MarginCell pct={range.b2bMarginPct} mode={range.b2bMarginMode} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  Nenhuma faixa cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MarginCell({ pct, mode }: { pct: number; mode: MarginMode }) {
  return (
    <span className="whitespace-nowrap">
      {formatPercent(pct)}{" "}
      <span className="text-xs text-muted-foreground">
        ({mode === "substituir" ? "substitui" : "soma"})
      </span>
    </span>
  );
}

// Cadastro/edição/remoção dos portes em si (código, nome, ordem). P/M/G são
// portes de sistema: nome e ordem editáveis, mas código imutável e sem
// remoção (ver Requirement "Portes de sistema P/M/G sempre presentes e
// protegidos").
function SizeTierManager({ tiers, canWrite }: { tiers: SizeTierDefinition[]; canWrite: boolean }) {
  const router = useRouter();
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(nextSortOrder(tiers));
  const [busy, setBusy] = useState(false);

  const isEditing = editingCode !== null;

  function resetForm() {
    setEditingCode(null);
    setCode("");
    setLabel("");
    setSortOrder(nextSortOrder(tiers));
  }

  function startEdit(tier: SizeTierDefinition) {
    setEditingCode(tier.code);
    setCode(tier.code);
    setLabel(tier.label);
    setSortOrder(tier.sortOrder);
  }

  async function handleSubmit() {
    setBusy(true);
    const result = isEditing
      ? await updateSizeTierAction(editingCode!, { label, sortOrder })
      : await createSizeTierAction({ code, label, sortOrder });
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível salvar o porte.");
      return;
    }
    toast.success(isEditing ? "Porte atualizado." : "Porte cadastrado.");
    resetForm();
    router.refresh();
  }

  async function handleRemove(tier: SizeTierDefinition) {
    setBusy(true);
    const result = await removeSizeTierAction(tier.code);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível remover o porte.");
      return;
    }
    toast.success("Porte removido.");
    if (editingCode === tier.code) resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">Portes cadastrados</h4>
        <p className="text-xs text-muted-foreground">
          P, M e G são portes de sistema (código fixo, não removíveis). Cadastre portes personalizados além deles — o
          código é a identidade curta (ex.: GG) e a ordem posiciona o porte na régua de tamanho.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ordem</TableHead>
              {canWrite && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier) => (
              <TableRow key={tier.code}>
                <TableCell className="font-medium">
                  {tier.code}
                  {tier.isSystem && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      sistema
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{tier.label}</TableCell>
                <TableCell>{tier.sortOrder}</TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="icon" variant="ghost" disabled={busy} onClick={() => startEdit(tier)}>
                        <PencilIcon className="size-4" />
                        <span className="sr-only">Editar {tier.code}</span>
                      </Button>
                      {!tier.isSystem && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => handleRemove(tier)}
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Remover {tier.code}</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canWrite && (
        <div className="space-y-3 rounded-md border p-3">
          <h5 className="text-sm font-medium text-foreground">
            {isEditing ? `Editar porte ${editingCode}` : "Cadastrar novo porte"}
          </h5>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tier-code">Código</Label>
              <Input
                id="tier-code"
                value={code}
                maxLength={4}
                // Código é identidade imutável: ao editar, fica travado.
                disabled={isEditing}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="Ex.: GG"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-label">Nome de exibição</Label>
              <Input
                id="tier-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ex.: Extra Grande"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tier-order">Ordem</Label>
              <Input
                id="tier-order"
                type="number"
                step="1"
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={handleSubmit}>
              {isEditing ? "Salvar alterações" : "Cadastrar porte"}
            </Button>
            {isEditing && (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Próxima ordem livre (maior + 10), para o cadastro sugerir um valor que não
// colida com os existentes.
function nextSortOrder(tiers: SizeTierDefinition[]): number {
  return tiers.reduce((max, tier) => Math.max(max, tier.sortOrder), 0) + 10;
}

export function SizeTierHistoryTable({
  history,
  tiers,
}: {
  history: SizeTierRange[];
  tiers: SizeTierDefinition[];
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Porte</TableHead>
            <TableHead>Peso</TableHead>
            <TableHead>Tempo</TableHead>
            <TableHead>Margem B2C</TableHead>
            <TableHead>Margem B2B</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.length ? (
            history.map((range) => (
              <TableRow key={range.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(range.validFrom).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>{tierLabel(range.tier, tiers)}</TableCell>
                <TableCell>
                  {range.minWeightGrams}g – {range.maxWeightGrams}g
                </TableCell>
                <TableCell>
                  {range.minPrintHours}h – {range.maxPrintHours}h
                </TableCell>
                <TableCell>
                  <MarginCell pct={range.b2cMarginPct} mode={range.b2cMarginMode} />
                </TableCell>
                <TableCell>
                  <MarginCell pct={range.b2bMarginPct} mode={range.b2bMarginMode} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                Nenhum histórico ainda.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
