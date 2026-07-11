import type { Repositories } from "@/lib/repositories";
import type { CreateMaterialStockMovementInput } from "@/lib/repositories/interfaces/material-stock-movement-repository.interface";
import type { CreateProductStockMovementInput } from "@/lib/repositories/interfaces/product-stock-movement-repository.interface";
import type { UpsertMaterialStockThresholdInput } from "@/lib/repositories/interfaces/material-stock-threshold-repository.interface";
import type {
  MaterialStockMovement,
  MaterialStockStatus,
  MaterialStockThreshold,
  ProductStockMovement,
} from "@/types/inventory";

export interface RegisterMaterialConsumptionInput {
  materialId: string;
  quantity: number;
  printerId?: string | null;
  productId?: string | null;
  notes?: string | null;
  createdBy: string | null;
  // Quando true, gera na mesma operação a entrada correspondente em
  // product_stock_movements (ver Requirement "Vínculo opcional entre
  // consumo de insumo e produção de peça"). productId e producedQuantity
  // passam a ser obrigatórios nesse caso.
  generateProductStock?: boolean;
  producedQuantity?: number;
}

export interface RegisterMaterialConsumptionResult {
  materialMovement: MaterialStockMovement;
  productMovement: ProductStockMovement | null;
}

type InventoryRepositories = Pick<
  Repositories,
  "materials" | "materialStockMovements" | "materialStockThresholds" | "productStockMovements"
>;

export class InventoryService {
  constructor(private readonly repositories: InventoryRepositories) {}

  async registerMaterialMovement(input: CreateMaterialStockMovementInput): Promise<MaterialStockMovement> {
    return this.repositories.materialStockMovements.create(input);
  }

  // Registra a saída de consumo de insumo e, opcionalmente, já cria a
  // entrada de peça pronta vinculada na mesma operação (ver design.md
  // decisão 4). O vínculo é feito aqui no service, não por trigger de
  // banco: o consumo de insumo pode acontecer antes da peça estar pronta/
  // aprovada, então acoplar as duas movimentações no banco criaria falsos
  // positivos de "peça pronta" antes da hora.
  async registerMaterialConsumption(
    input: RegisterMaterialConsumptionInput,
  ): Promise<RegisterMaterialConsumptionResult> {
    if (input.quantity >= 0) {
      throw new Error("A quantidade de um consumo_producao deve ser negativa (saída).");
    }

    const materialMovement = await this.repositories.materialStockMovements.create({
      materialId: input.materialId,
      quantity: input.quantity,
      movementType: "consumo_producao",
      printerId: input.printerId ?? null,
      productId: input.productId ?? null,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
    });

    if (!input.generateProductStock) {
      return { materialMovement, productMovement: null };
    }

    if (!input.productId) {
      throw new Error("productId é obrigatório para gerar a peça pronta vinculada.");
    }
    if (!input.producedQuantity || input.producedQuantity <= 0) {
      throw new Error("producedQuantity deve ser positivo para gerar a peça pronta vinculada.");
    }

    const productMovement = await this.repositories.productStockMovements.create({
      productId: input.productId,
      quantity: input.producedQuantity,
      movementType: "producao",
      materialStockMovementId: materialMovement.id,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
    });

    return { materialMovement, productMovement };
  }

  async registerProductMovement(input: CreateProductStockMovementInput): Promise<ProductStockMovement> {
    return this.repositories.productStockMovements.create(input);
  }

  async setMaterialStockThreshold(
    input: UpsertMaterialStockThresholdInput,
  ): Promise<MaterialStockThreshold> {
    return this.repositories.materialStockThresholds.upsert(input);
  }

  // Insumo sem limite configurado nunca é sinalizado como estoque baixo
  // (ver Requirement "Insumo sem limite configurado nunca é sinalizado"),
  // independente do saldo derivado atual.
  async getMaterialStockStatus(materialId: string): Promise<MaterialStockStatus> {
    const [balance, threshold] = await Promise.all([
      this.repositories.materialStockMovements.findBalanceByMaterialId(materialId),
      this.repositories.materialStockThresholds.findByMaterialId(materialId),
    ]);

    return {
      materialId,
      balance,
      minimumQuantity: threshold?.minimumQuantity ?? null,
      isLowStock: threshold != null && balance < threshold.minimumQuantity,
    };
  }

  async listMaterialStockStatuses(): Promise<MaterialStockStatus[]> {
    const materials = await this.repositories.materials.findAll();
    return Promise.all(materials.map((material) => this.getMaterialStockStatus(material.id)));
  }
}
