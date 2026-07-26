"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResultadoCalculo } from "@/components/shared/resultado-calculo";
import {
  addComponentAction,
  removeComponentAction,
} from "@/app/(dashboard)/producao/catalogo/actions";
import { calculateCompositePriceAction } from "@/app/(dashboard)/precificacao/actions";
import type { Product, ProductComponent } from "@/types/catalog";
import type { PriceCalculation, PriceCalculationResult, SizeTier, SizeTierDefinition } from "@/types/pricing";

interface ProductComponentsManagerProps {
  parentProductId: string;
  initialComponents: ProductComponent[];
  // Nº de partes inline da peça composta. O cálculo do kit agrega partes +
  // componentes, então ele deve estar disponível quando houver partes, mesmo
  // sem nenhum componente do catálogo.
  initialPartsCount?: number;
  // Portes cadastrados: alimentam o seletor de porte do kit (todos os portes,
  // não só P/M/G) e o rótulo no resultado.
  tiers: SizeTierDefinition[];
  // Candidatas a componente: peças `simples` do catálogo, exceto a própria
  // peça composta. hasKnownCost indica se já têm cálculo de preço salvo
  // (aproximação só para a dica visual — não checa ficha de fatiamento
  // isoladamente); a validação real e definitiva acontece no servidor via
  // CatalogService.addComponent, que também aceita peça com ficha mas sem
  // cálculo salvo.
  candidateProducts: Array<Pick<Product, "id" | "name"> & { hasKnownCost: boolean }>;
  canWrite: boolean;
}

export function ProductComponentsManager({
  parentProductId,
  initialComponents,
  initialPartsCount = 0,
  tiers,
  candidateProducts,
  canWrite,
}: ProductComponentsManagerProps) {
  const router = useRouter();
  const [components, setComponents] = useState<ProductComponent[]>(initialComponents);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PriceCalculationResult | PriceCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [chosenTier, setChosenTier] = useState<SizeTier | "">("");

  const productNameById = useMemo(
    () => new Map(candidateProducts.map((product) => [product.id, product.name])),
    [candidateProducts],
  );

  const usedProductIds = new Set(components.map((component) => component.componentProductId));
  const availableProducts = candidateProducts.filter((product) => !usedProductIds.has(product.id));

  // Componentes sem ficha/cálculo salvo no momento em que a peça foi
  // carregada — usado para o alerta não bloqueante de cálculo automático
  // (ver Requirement "Exibir alerta não bloqueante quando o cálculo gerar
  // um novo cálculo para componente órfão").
  const orphanComponentIds = new Set(
    candidateProducts.filter((product) => !product.hasKnownCost).map((product) => product.id),
  );
  const calculatedOrphans = components.filter((component) => orphanComponentIds.has(component.componentProductId));

  async function handleAddComponent() {
    if (!selectedProductId) return;
    setIsSubmitting(true);
    const response = await addComponentAction(parentProductId, selectedProductId, quantity);
    setIsSubmitting(false);

    if (!response.ok || !response.component) {
      toast.error(response.error ?? "Não foi possível adicionar o componente.");
      return;
    }

    setComponents((current) => [...current, response.component!]);
    setSelectedProductId("");
    setQuantity(1);
    toast.success("Componente adicionado.");
    router.refresh();
  }

  async function handleRemoveComponent(id: string) {
    const response = await removeComponentAction(parentProductId, id);
    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível remover o componente.");
      return;
    }
    setComponents((current) => current.filter((component) => component.id !== id));
    router.refresh();
  }

  async function handleCalculate() {
    if (!chosenTier) return;
    setIsCalculating(true);
    const response = await calculateCompositePriceAction({
      productId: parentProductId,
      chosenTier,
    });
    setIsCalculating(false);

    if (!response.ok) {
      toast.error(response.error ?? "Não foi possível calcular o preço da peça composta.");
      return;
    }
    setResult(response.result ?? null);
    toast.success("Cálculo da peça composta salvo no histórico.");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">Componentes do kit</h3>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Peça</TableHead>
              <TableHead>Quantidade</TableHead>
              {canWrite && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length ? (
              components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell className="font-medium">
                    {productNameById.get(component.componentProductId) ?? component.componentProductId}
                  </TableCell>
                  <TableCell>{component.quantity}</TableCell>
                  {canWrite && (
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveComponent(component.id)}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canWrite ? 3 : 2} className="h-20 text-center text-muted-foreground">
                  Nenhum componente adicionado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {canWrite && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Peça componente</label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                    {!product.hasKnownCost && " (sem ficha/cálculo)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Quantidade</label>
            <Input
              type="number"
              min={1}
              step={1}
              className="w-24"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <Button type="button" size="sm" disabled={!selectedProductId || isSubmitting} onClick={handleAddComponent}>
            Adicionar componente
          </Button>
        </div>
      )}

      {(components.length > 0 || initialPartsCount > 0) && (
        <div className="space-y-3">
          {/* Um kit não tem um único peso/tempo a classificar, e o porte
              determina a margem de lucro aplicada — então ele vem do usuário
              (ver Requirement "Cálculo de custo agregado para peça composta").
              O cálculo agrega partes inline + componentes do catálogo. */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Porte do kit</label>
              <Select value={chosenTier} onValueChange={(value) => setChosenTier(value as SizeTier)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Escolha o porte" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.code} value={tier.code}>
                      {tier.label} ({tier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCalculating || !chosenTier}
              onClick={handleCalculate}
            >
              Calcular preço do kit
            </Button>
          </div>
          {!chosenTier && (
            <p className="text-xs text-muted-foreground">
              Escolha o porte do kit para calcular — ele define a margem de lucro aplicada ao preço.
            </p>
          )}

          {calculatedOrphans.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
              Atenção: {calculatedOrphans
                .map((component) => productNameById.get(component.componentProductId) ?? component.componentProductId)
                .join(", ")}{" "}
              ainda não tinha cálculo de preço salvo — ao calcular o kit, o sistema gera e salva um cálculo
              automático para esse(s) componente(s) a partir da ficha de fatiamento cadastrada.
            </div>
          )}

          {result && (
            <ResultadoCalculo
              result={result}
              saved
              tiers={tiers}
              componentNames={Object.fromEntries(candidateProducts.map((product) => [product.id, product.name]))}
            />
          )}
        </div>
      )}
    </div>
  );
}
