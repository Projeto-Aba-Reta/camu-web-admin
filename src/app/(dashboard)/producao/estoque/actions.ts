"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories, type Repositories } from "@/lib/repositories";
import { InventoryService } from "@/lib/services/inventory-service";
import { requireInventoryWrite } from "@/lib/auth/inventory-access";
import type { MaterialMovementType, MaterialType, ProductMovementType } from "@/types/inventory";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const INSUMOS_PATH = "/producao/estoque/insumos";
const PECAS_PATH = "/producao/estoque/pecas";

async function getRepositories(): Promise<Repositories> {
  const supabase = await createClient();
  return createRepositories(supabase);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// =============================================================================
// Insumo
// =============================================================================

export interface MaterialFormInput {
  name: string;
  type: MaterialType;
  unit: string;
  referenceCost: number;
}

export async function createMaterialAction(input: MaterialFormInput): Promise<ActionResult> {
  try {
    const user = await requireInventoryWrite();
    const repositories = await getRepositories();
    await repositories.materials.create({ ...input, createdBy: user.id });
    revalidatePath(INSUMOS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cadastrar o insumo.") };
  }
}

export async function updateMaterialAction(materialId: string, input: MaterialFormInput): Promise<ActionResult> {
  try {
    await requireInventoryWrite();
    const repositories = await getRepositories();
    await repositories.materials.update(materialId, input);
    revalidatePath(INSUMOS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar o insumo.") };
  }
}

// =============================================================================
// Movimentação de insumo
// =============================================================================

export interface MaterialMovementActionInput {
  materialId: string;
  movementType: MaterialMovementType;
  quantity: number;
  printerId?: string | null;
  productId?: string | null;
  producedQuantity?: number | null;
  notes?: string | null;
}

export async function registerMaterialMovementAction(input: MaterialMovementActionInput): Promise<ActionResult> {
  try {
    const user = await requireInventoryWrite();
    const repositories = await getRepositories();
    const inventoryService = new InventoryService(repositories);

    if (input.movementType === "consumo_producao") {
      await inventoryService.registerMaterialConsumption({
        materialId: input.materialId,
        quantity: input.quantity,
        printerId: input.printerId ?? null,
        productId: input.productId ?? null,
        notes: input.notes ?? null,
        createdBy: user.id,
        generateProductStock: Boolean(input.productId),
        producedQuantity: input.producedQuantity ?? undefined,
      });
    } else {
      await inventoryService.registerMaterialMovement({
        materialId: input.materialId,
        quantity: input.quantity,
        movementType: input.movementType,
        notes: input.notes ?? null,
        createdBy: user.id,
      });
    }

    revalidatePath(INSUMOS_PATH);
    revalidatePath(PECAS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível registrar a movimentação.") };
  }
}

// =============================================================================
// Limite mínimo
// =============================================================================

export interface ThresholdActionInput {
  materialId: string;
  minimumQuantity: number;
}

export async function setMaterialStockThresholdAction(input: ThresholdActionInput): Promise<ActionResult> {
  try {
    const user = await requireInventoryWrite();
    const repositories = await getRepositories();
    const inventoryService = new InventoryService(repositories);
    await inventoryService.setMaterialStockThreshold({
      materialId: input.materialId,
      minimumQuantity: input.minimumQuantity,
      updatedBy: user.id,
    });
    revalidatePath(INSUMOS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar o limite mínimo.") };
  }
}

// =============================================================================
// Movimentação de peça pronta
// =============================================================================

export interface ProductMovementActionInput {
  productId: string;
  movementType: ProductMovementType;
  quantity: number;
  notes?: string | null;
}

export async function registerProductMovementAction(input: ProductMovementActionInput): Promise<ActionResult> {
  try {
    const user = await requireInventoryWrite();
    const repositories = await getRepositories();
    const inventoryService = new InventoryService(repositories);
    await inventoryService.registerProductMovement({
      productId: input.productId,
      quantity: input.quantity,
      movementType: input.movementType,
      notes: input.notes ?? null,
      createdBy: user.id,
    });
    revalidatePath(PECAS_PATH);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível registrar a movimentação.") };
  }
}
