import { describe, it, expect } from "vitest";
import { InventoryService } from "./inventory-service";
import type {
  CreateMaterialStockMovementInput,
  IMaterialStockMovementRepository,
  MaterialStockBalance,
} from "@/lib/repositories/interfaces/material-stock-movement-repository.interface";
import type {
  IMaterialStockThresholdRepository,
  UpsertMaterialStockThresholdInput,
} from "@/lib/repositories/interfaces/material-stock-threshold-repository.interface";
import type {
  CreateProductStockMovementInput,
  IProductStockMovementRepository,
  ProductStockBalance,
} from "@/lib/repositories/interfaces/product-stock-movement-repository.interface";
import type { IMaterialRepository } from "@/lib/repositories/interfaces/material-repository.interface";
import type {
  Material,
  MaterialStockMovement,
  MaterialStockThreshold,
  ProductStockMovement,
} from "@/types/inventory";

// Fakes computam o saldo por soma das movimentações, do mesmo jeito que a
// view material_stock_balances/product_stock_balances faz no banco (ver
// design.md decisão 1) — permite testar a derivação sem um Postgres real.
class FakeMaterialStockMovementRepository implements IMaterialStockMovementRepository {
  public movements: MaterialStockMovement[] = [];

  async findByMaterialId(materialId: string): Promise<MaterialStockMovement[]> {
    return this.movements.filter((m) => m.materialId === materialId);
  }

  async create(input: CreateMaterialStockMovementInput): Promise<MaterialStockMovement> {
    const movement: MaterialStockMovement = {
      id: `material-movement-${this.movements.length + 1}`,
      materialId: input.materialId,
      quantity: input.quantity,
      movementType: input.movementType,
      printerId: input.printerId ?? null,
      productId: input.productId ?? null,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.movements.push(movement);
    return movement;
  }

  async findBalanceByMaterialId(materialId: string): Promise<number> {
    return this.movements.filter((m) => m.materialId === materialId).reduce((sum, m) => sum + m.quantity, 0);
  }

  async findAllBalances(): Promise<MaterialStockBalance[]> {
    const materialIds = new Set(this.movements.map((m) => m.materialId));
    return Promise.all(
      Array.from(materialIds).map(async (materialId) => ({
        materialId,
        balance: await this.findBalanceByMaterialId(materialId),
      })),
    );
  }
}

class FakeMaterialStockThresholdRepository implements IMaterialStockThresholdRepository {
  public thresholds: MaterialStockThreshold[] = [];

  async findByMaterialId(materialId: string): Promise<MaterialStockThreshold | null> {
    return this.thresholds.find((t) => t.materialId === materialId) ?? null;
  }

  async findAll(): Promise<MaterialStockThreshold[]> {
    return this.thresholds;
  }

  async upsert(input: UpsertMaterialStockThresholdInput): Promise<MaterialStockThreshold> {
    const existing = this.thresholds.find((t) => t.materialId === input.materialId);
    if (existing) {
      existing.minimumQuantity = input.minimumQuantity;
      existing.updatedBy = input.updatedBy;
      return existing;
    }
    const threshold: MaterialStockThreshold = {
      id: `threshold-${this.thresholds.length + 1}`,
      materialId: input.materialId,
      minimumQuantity: input.minimumQuantity,
      updatedBy: input.updatedBy,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    this.thresholds.push(threshold);
    return threshold;
  }
}

class FakeProductStockMovementRepository implements IProductStockMovementRepository {
  public movements: ProductStockMovement[] = [];

  async findByProductId(productId: string): Promise<ProductStockMovement[]> {
    return this.movements.filter((m) => m.productId === productId);
  }

  async create(input: CreateProductStockMovementInput): Promise<ProductStockMovement> {
    const movement: ProductStockMovement = {
      id: `product-movement-${this.movements.length + 1}`,
      productId: input.productId,
      quantity: input.quantity,
      movementType: input.movementType,
      materialStockMovementId: input.materialStockMovementId ?? null,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.movements.push(movement);
    return movement;
  }

  async findBalanceByProductId(productId: string): Promise<number> {
    return this.movements.filter((m) => m.productId === productId).reduce((sum, m) => sum + m.quantity, 0);
  }

  async findAllBalances(): Promise<ProductStockBalance[]> {
    const productIds = new Set(this.movements.map((m) => m.productId));
    return Promise.all(
      Array.from(productIds).map(async (productId) => ({
        productId,
        balance: await this.findBalanceByProductId(productId),
      })),
    );
  }
}

class FakeMaterialRepository implements IMaterialRepository {
  public materials: Material[] = [];

  async findById(id: string): Promise<Material | null> {
    return this.materials.find((m) => m.id === id) ?? null;
  }
  async findAll(): Promise<Material[]> {
    return this.materials;
  }
  async create(): Promise<Material> {
    throw new Error("not implemented in fake");
  }
  async update(): Promise<Material> {
    throw new Error("not implemented in fake");
  }
}

function makeService() {
  const materials = new FakeMaterialRepository();
  const materialStockMovements = new FakeMaterialStockMovementRepository();
  const materialStockThresholds = new FakeMaterialStockThresholdRepository();
  const productStockMovements = new FakeProductStockMovementRepository();

  const service = new InventoryService({
    materials,
    materialStockMovements,
    materialStockThresholds,
    productStockMovements,
  });

  return { service, materials, materialStockMovements, materialStockThresholds, productStockMovements };
}

describe("InventoryService saldo derivado", () => {
  it("bate com a soma manual de um conjunto de movimentações de teste", async () => {
    const { service, materialStockMovements } = makeService();
    const materialId = "material-1";

    await materialStockMovements.create({
      materialId,
      quantity: 3000,
      movementType: "compra",
      createdBy: null,
    });
    await materialStockMovements.create({
      materialId,
      quantity: -15,
      movementType: "consumo_producao",
      createdBy: null,
    });
    await materialStockMovements.create({
      materialId,
      quantity: -35,
      movementType: "consumo_producao",
      createdBy: null,
    });
    await materialStockMovements.create({
      materialId,
      quantity: -50,
      movementType: "perda_refugo",
      createdBy: null,
    });

    const manualSum = 3000 - 15 - 35 - 50;
    const status = await service.getMaterialStockStatus(materialId);

    expect(status.balance).toBe(manualSum);
  });
});

describe("InventoryService alerta de estoque baixo", () => {
  it("insumo sem limite configurado nunca aparece como estoque baixo", async () => {
    const { service, materialStockMovements } = makeService();
    const materialId = "material-sem-limite";

    // Saldo bem baixo (quase zero), mas nenhum limite configurado.
    await materialStockMovements.create({
      materialId,
      quantity: 5,
      movementType: "compra",
      createdBy: null,
    });

    const status = await service.getMaterialStockStatus(materialId);

    expect(status.minimumQuantity).toBeNull();
    expect(status.isLowStock).toBe(false);
  });

  it("sinaliza estoque baixo quando o saldo cai abaixo do limite configurado", async () => {
    const { service, materialStockMovements, materialStockThresholds } = makeService();
    const materialId = "material-com-limite";

    await materialStockThresholds.upsert({ materialId, minimumQuantity: 500, updatedBy: null });
    await materialStockMovements.create({
      materialId,
      quantity: 400,
      movementType: "compra",
      createdBy: null,
    });

    const status = await service.getMaterialStockStatus(materialId);

    expect(status.isLowStock).toBe(true);
  });
});

describe("InventoryService.registerMaterialConsumption", () => {
  it("cria as duas movimentações vinculadas quando generateProductStock é true", async () => {
    const { service, materialStockMovements, productStockMovements } = makeService();

    const result = await service.registerMaterialConsumption({
      materialId: "material-1",
      quantity: -15,
      productId: "product-1",
      producedQuantity: 1,
      generateProductStock: true,
      createdBy: null,
    });

    expect(result.materialMovement.movementType).toBe("consumo_producao");
    expect(result.materialMovement.quantity).toBe(-15);
    expect(result.productMovement).not.toBeNull();
    expect(result.productMovement?.movementType).toBe("producao");
    expect(result.productMovement?.materialStockMovementId).toBe(result.materialMovement.id);

    expect(await materialStockMovements.findByMaterialId("material-1")).toHaveLength(1);
    expect(await productStockMovements.findByProductId("product-1")).toHaveLength(1);
  });

  it("registra apenas a saída de insumo quando generateProductStock não é informado", async () => {
    const { service, productStockMovements } = makeService();

    const result = await service.registerMaterialConsumption({
      materialId: "material-1",
      quantity: -15,
      productId: "product-1",
      createdBy: null,
    });

    expect(result.productMovement).toBeNull();
    expect(await productStockMovements.findByProductId("product-1")).toHaveLength(0);
  });
});
