"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  addPartAction,
  removePartAction,
  updatePartAction,
  type PartFormInput,
} from "@/app/(dashboard)/producao/catalogo/actions";
import type { PiecePart } from "@/types/catalog";
import type { Material } from "@/types/inventory";
import type { Printer } from "@/types/pricing";

// Valor sentinela para "sem insumo vinculado" no Select (radix não aceita "").
// Uma parte sem filamento vinculado usa o preço global por kg (fallback).
const NO_MATERIAL = "__none__";

interface ProductPartsManagerProps {
  productId: string;
  initialParts: PiecePart[];
  // Impressoras ativas do parque (para o custo de máquina de cada parte).
  printers: Printer[];
  // Insumos de filamento do estoque (para o custo de filamento da parte).
  filamentMaterials: Material[];
  canWrite: boolean;
}

interface PartDraft {
  name: string;
  quantity: number;
  materialId: string; // NO_MATERIAL quando sem vínculo
  pieceGrams: number;
  supportGrams: number;
  printerId: string;
  printHours: number;
}

function emptyDraft(printers: Printer[]): PartDraft {
  return {
    name: "",
    quantity: 1,
    materialId: NO_MATERIAL,
    pieceGrams: 0,
    supportGrams: 0,
    printerId: printers[0]?.id ?? "",
    printHours: 1,
  };
}

function draftFromPart(part: PiecePart): PartDraft {
  return {
    name: part.name,
    quantity: part.quantity,
    materialId: part.materialId ?? NO_MATERIAL,
    pieceGrams: part.pieceGrams,
    supportGrams: part.supportGrams,
    printerId: part.printerId,
    printHours: part.printHours,
  };
}

function toInput(draft: PartDraft): PartFormInput {
  return {
    name: draft.name.trim(),
    quantity: draft.quantity,
    materialId: draft.materialId === NO_MATERIAL ? null : draft.materialId,
    pieceGrams: draft.pieceGrams,
    supportGrams: draft.supportGrams,
    printerId: draft.printerId,
    printHours: draft.printHours,
  };
}

export function ProductPartsManager({
  productId,
  initialParts,
  printers,
  filamentMaterials,
  canWrite,
}: ProductPartsManagerProps) {
  const router = useRouter();
  const [parts, setParts] = useState<PiecePart[]>(initialParts);
  const [draft, setDraft] = useState<PartDraft>(() => emptyDraft(printers));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const materialNameById = useMemo(
    () => new Map(filamentMaterials.map((material) => [material.id, material.name])),
    [filamentMaterials],
  );
  const printerNameById = useMemo(
    () => new Map(printers.map((printer) => [printer.id, printer.name])),
    [printers],
  );

  function resetForm() {
    setDraft(emptyDraft(printers));
    setEditingId(null);
  }

  function startEdit(part: PiecePart) {
    setDraft(draftFromPart(part));
    setEditingId(part.id);
  }

  const canSubmit =
    draft.name.trim().length > 0 &&
    draft.printerId.length > 0 &&
    draft.quantity > 0 &&
    draft.printHours > 0 &&
    draft.pieceGrams + draft.supportGrams > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const input = toInput(draft);
    const response = editingId
      ? await updatePartAction(productId, editingId, input)
      : await addPartAction(productId, input);
    setIsSubmitting(false);

    if (!response.ok || !response.part) {
      toast.error(response.error ?? "Não foi possível salvar a parte.");
      return;
    }

    setParts((current) =>
      editingId
        ? current.map((part) => (part.id === editingId ? response.part! : part))
        : [...current, response.part!],
    );
    toast.success(editingId ? "Parte atualizada." : "Parte adicionada.");
    resetForm();
    router.refresh();
  }

  async function handleRemove(id: string) {
    const response = await removePartAction(productId, id);
    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível remover a parte.");
      return;
    }
    setParts((current) => current.filter((part) => part.id !== id));
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Partes impressas</h3>
        <p className="text-xs text-muted-foreground">
          Partes são sub-itens desta peça composta, impressos separadamente — não são vendidas nem catalogadas
          isoladamente. Cada parte tem seu filamento, gramas, impressora e tempo próprios.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parte</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Filamento</TableHead>
              <TableHead>Gramas (peça/suporte)</TableHead>
              <TableHead>Impressora</TableHead>
              <TableHead>Tempo (h)</TableHead>
              {canWrite && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.length ? (
              parts.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell>{part.quantity}</TableCell>
                  <TableCell>
                    {part.materialId
                      ? materialNameById.get(part.materialId) ?? part.materialId
                      : "preço global"}
                  </TableCell>
                  <TableCell>
                    {part.pieceGrams}g / {part.supportGrams}g
                  </TableCell>
                  <TableCell>{printerNameById.get(part.printerId) ?? part.printerId}</TableCell>
                  <TableCell>{part.printHours}</TableCell>
                  {canWrite && (
                    <TableCell className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(part)}>
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(part.id)}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="h-20 text-center text-muted-foreground">
                  Nenhuma parte adicionada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {canWrite && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome da parte</label>
              <Input
                className="w-48"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ex.: Decágono central"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <Input
                type="number"
                min={1}
                step={1}
                className="w-20"
                value={draft.quantity}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Filamento</label>
              <Select
                value={draft.materialId}
                onValueChange={(value) => setDraft((d) => ({ ...d, materialId: value }))}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MATERIAL}>Sem vínculo (preço global)</SelectItem>
                  {filamentMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Gramas na peça</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-24"
                value={draft.pieceGrams}
                onChange={(e) => setDraft((d) => ({ ...d, pieceGrams: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Gramas em suporte</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-24"
                value={draft.supportGrams}
                onChange={(e) => setDraft((d) => ({ ...d, supportGrams: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Impressora</label>
              <Select value={draft.printerId} onValueChange={(value) => setDraft((d) => ({ ...d, printerId: value }))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {printers.map((printer) => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tempo (h)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-24"
                value={draft.printHours}
                onChange={(e) => setDraft((d) => ({ ...d, printHours: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
              {editingId ? "Salvar parte" : "Adicionar parte"}
            </Button>
            {editingId && (
              <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
