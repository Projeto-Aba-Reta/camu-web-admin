import { describe, it, expect } from "vitest";
import { CatalogService, ProductDeletionBlockedError } from "./catalog-service";
import type { IPrintQueueRepository } from "@/lib/repositories/interfaces/print-queue-repository.interface";
import type { IProductStockMovementRepository } from "@/lib/repositories/interfaces/product-stock-movement-repository.interface";
import type { IMaterialStockMovementRepository } from "@/lib/repositories/interfaces/material-stock-movement-repository.interface";
import type {
  CreateProductInput,
  IProductRepository,
  UpdateProductInput,
} from "@/lib/repositories/interfaces/product-repository.interface";
import type {
  CreateProductMediaInput,
  IProductMediaRepository,
} from "@/lib/repositories/interfaces/product-media-repository.interface";
import type {
  CreateProductChannelListingInput,
  IProductChannelListingRepository,
  UpdateProductChannelListingInput,
} from "@/lib/repositories/interfaces/product-channel-listing-repository.interface";
import type { IPriceCalculationRepository } from "@/lib/repositories/interfaces/price-calculation-repository.interface";
import type {
  CreateProductComponentInput,
  IProductComponentRepository,
} from "@/lib/repositories/interfaces/product-component-repository.interface";
import type {
  ISlicingSheetRepository,
  UpsertSlicingSheetInput,
} from "@/lib/repositories/interfaces/slicing-sheet-repository.interface";
import type { Product, ProductChannelListing, ProductComponent, ProductMedia } from "@/types/catalog";
import type { PriceCalculation } from "@/types/pricing";
import type { SlicingSheet } from "@/types/slicing-sheet";

class FakeProductRepository implements IProductRepository {
  public products: Product[] = [];

  async findById(id: string) {
    return this.products.find((p) => p.id === id) ?? null;
  }
  async findAll() {
    return this.products;
  }
  async create(input: CreateProductInput): Promise<Product> {
    const product: Product = {
      id: `product-${this.products.length + 1}`,
      name: input.name,
      description: input.description,
      category: input.category,
      sizeTier: null,
      status: "rascunho",
      productType: input.productType ?? "simples",
      priceCalculationId: null,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    this.products.push(product);
    return product;
  }
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new Error("not found");
    Object.assign(product, input);
    return product;
  }
  async delete(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
  }
}

class FakeProductMediaRepository implements IProductMediaRepository {
  public media: ProductMedia[] = [];

  async findById(id: string) {
    return this.media.find((m) => m.id === id) ?? null;
  }
  async findByProductId(productId: string) {
    return this.media.filter((m) => m.productId === productId).sort((a, b) => a.displayOrder - b.displayOrder);
  }
  async create(input: CreateProductMediaInput): Promise<ProductMedia> {
    const item: ProductMedia = {
      id: `media-${this.media.length + 1}`,
      productId: input.productId,
      storagePath: input.storagePath,
      displayOrder: input.displayOrder,
      isCover: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.media.push(item);
    return item;
  }
  async updateDisplayOrder(id: string, displayOrder: number): Promise<void> {
    const item = this.media.find((m) => m.id === id);
    if (item) item.displayOrder = displayOrder;
  }
  async setCover(id: string, productId: string): Promise<void> {
    for (const item of this.media) {
      if (item.productId === productId) item.isCover = false;
    }
    const target = this.media.find((m) => m.id === id);
    if (target) target.isCover = true;
  }
  async delete(id: string): Promise<void> {
    this.media = this.media.filter((m) => m.id !== id);
  }
}

class FakeProductChannelListingRepository implements IProductChannelListingRepository {
  public listings: ProductChannelListing[] = [];

  async findByProductId(productId: string) {
    return this.listings.filter((l) => l.productId === productId);
  }
  async create(input: CreateProductChannelListingInput): Promise<ProductChannelListing> {
    const listing: ProductChannelListing = {
      id: `listing-${this.listings.length + 1}`,
      productId: input.productId,
      channel: input.channel,
      listedPrice: input.listedPrice,
      isActive: true,
      priceOverrideReason: input.priceOverrideReason ?? null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    this.listings.push(listing);
    return listing;
  }
  async update(id: string, input: UpdateProductChannelListingInput): Promise<ProductChannelListing> {
    const listing = this.listings.find((l) => l.id === id);
    if (!listing) throw new Error("not found");
    Object.assign(listing, input);
    return listing;
  }
}

class FakePriceCalculationRepository implements IPriceCalculationRepository {
  constructor(public calculations: PriceCalculation[] = []) {}
  async findById(id: string) {
    return this.calculations.find((c) => c.id === id) ?? null;
  }
  async findRecent() {
    return this.calculations;
  }
  async create(): Promise<PriceCalculation> {
    throw new Error("not implemented in fake");
  }
}

function makeCalculation(overrides: Partial<PriceCalculation> = {}): PriceCalculation {
  return {
    id: "calc-1",
    weightGrams: 35,
    printHours: 4.2,
    printerId: "printer-1",
    productId: null,
    slicingSheetId: null,
    costParametersId: "cost-1",
    suggestedTier: { ambiguous: false, tier: "M" },
    totalCost: 12.5,
    costBreakdown: {
      filamentCost: 3,
      energyCost: 1,
      depreciationCost: 3,
      failureReserveCost: 1,
      packagingCost: 3,
    },
    channelPrices: [
      { channel: "mercado_livre", suggestedPrice: 20, margin: 5 },
      { channel: "shopee", suggestedPrice: 22, margin: 6 },
    ],
    b2bPrices: [],
    componentBreakdown: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as PriceCalculation;
}

class FakeProductComponentRepository implements IProductComponentRepository {
  public components: ProductComponent[] = [];

  async findByParentId(parentProductId: string) {
    return this.components.filter((c) => c.parentProductId === parentProductId);
  }
  async findAllByParentIds(parentProductIds: string[]) {
    return this.components.filter((c) => parentProductIds.includes(c.parentProductId));
  }
  async create(input: CreateProductComponentInput): Promise<ProductComponent> {
    const component: ProductComponent = {
      id: `pc-${this.components.length + 1}`,
      parentProductId: input.parentProductId,
      componentProductId: input.componentProductId,
      quantity: input.quantity,
      createdBy: input.createdBy,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.components.push(component);
    return component;
  }
  async remove(id: string): Promise<void> {
    this.components = this.components.filter((c) => c.id !== id);
  }
  async findByComponentProductId(componentProductId: string) {
    return this.components.filter((c) => c.componentProductId === componentProductId);
  }
}

// As três guardas de exclusão que vêm de fora do catálogo. Só o
// countByProductId é exercitado aqui; o resto da interface não participa.
class FakePrintQueueRepository implements IPrintQueueRepository {
  public countByProduct = new Map<string, number>();

  async countByProductId(productId: string) {
    return this.countByProduct.get(productId) ?? 0;
  }
  async findById(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async listByStatus(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async create(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async update(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async setItemMaterials(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async findMaterialsByItemId(): Promise<never> {
    throw new Error("not implemented in fake");
  }
}

class FakeProductStockMovementRepository implements IProductStockMovementRepository {
  public countByProduct = new Map<string, number>();

  async countByProductId(productId: string) {
    return this.countByProduct.get(productId) ?? 0;
  }
  async findByProductId(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async create(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async findBalanceByProductId(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async findAllBalances(): Promise<never> {
    throw new Error("not implemented in fake");
  }
}

class FakeMaterialStockMovementRepository implements IMaterialStockMovementRepository {
  public countByProduct = new Map<string, number>();

  async countByProductId(productId: string) {
    return this.countByProduct.get(productId) ?? 0;
  }
  async findByMaterialId(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async create(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async findBalanceByMaterialId(): Promise<never> {
    throw new Error("not implemented in fake");
  }
  async findAllBalances(): Promise<never> {
    throw new Error("not implemented in fake");
  }
}

class FakeSlicingSheetRepository implements ISlicingSheetRepository {
  public sheets: SlicingSheet[] = [];

  async findAll() {
    return this.sheets;
  }

  async findByProductId(productId: string) {
    return this.sheets.filter((s) => s.productId === productId);
  }
  async findByProductAndPrinter(productId: string, printerId: string) {
    return this.sheets.find((s) => s.productId === productId && s.printerId === printerId) ?? null;
  }
  async upsert(input: UpsertSlicingSheetInput): Promise<SlicingSheet> {
    throw new Error("not implemented in fake" + JSON.stringify(input));
  }
  async delete(): Promise<void> {
    throw new Error("not implemented in fake");
  }
}

function makeService() {
  const products = new FakeProductRepository();
  const productMedia = new FakeProductMediaRepository();
  const productChannelListings = new FakeProductChannelListingRepository();
  const priceCalculations = new FakePriceCalculationRepository([makeCalculation()]);
  const productComponents = new FakeProductComponentRepository();
  const slicingSheets = new FakeSlicingSheetRepository();
  const printQueueItems = new FakePrintQueueRepository();
  const productStockMovements = new FakeProductStockMovementRepository();
  const materialStockMovements = new FakeMaterialStockMovementRepository();

  const service = new CatalogService({
    products,
    productMedia,
    productChannelListings,
    priceCalculations,
    productComponents,
    slicingSheets,
    printQueueItems,
    productStockMovements,
    materialStockMovements,
  });
  return {
    service,
    products,
    productMedia,
    productChannelListings,
    priceCalculations,
    productComponents,
    slicingSheets,
    printQueueItems,
    productStockMovements,
    materialStockMovements,
  };
}

describe("CatalogService.linkPriceCalculation", () => {
  it("copia a sugestão inicial (porte e preço por canal) sem alterar o cálculo original", async () => {
    const { service, products, productChannelListings, priceCalculations } = makeService();
    const product = await products.create({
      name: "Miniatura teste",
      description: null,
      category: "miniatura_colecionavel",
      createdBy: null,
    });

    const originalCalculation = { ...priceCalculations.calculations[0] };

    const updated = await service.linkPriceCalculation(product.id, "calc-1");

    expect(updated.priceCalculationId).toBe("calc-1");
    expect(updated.sizeTier).toBe("M");

    const listings = await productChannelListings.findByProductId(product.id);
    expect(listings).toHaveLength(2);
    expect(listings.find((l) => l.channel === "mercado_livre")?.listedPrice).toBe(20);
    expect(listings.find((l) => l.channel === "shopee")?.listedPrice).toBe(22);

    expect(priceCalculations.calculations[0]).toEqual(originalCalculation);
  });

  it("não sobrescreve uma listagem de canal já existente", async () => {
    const { service, products, productChannelListings } = makeService();
    const product = await products.create({
      name: "Miniatura teste",
      description: null,
      category: "miniatura_colecionavel",
      createdBy: null,
    });
    await productChannelListings.create({ productId: product.id, channel: "mercado_livre", listedPrice: 30 });

    await service.linkPriceCalculation(product.id, "calc-1");

    const listings = await productChannelListings.findByProductId(product.id);
    expect(listings.find((l) => l.channel === "mercado_livre")?.listedPrice).toBe(30);
    expect(listings.find((l) => l.channel === "shopee")?.listedPrice).toBe(22);
  });
});

describe("CatalogService.createChannelListing", () => {
  it("rejeita preço divergente do sugerido sem motivo", async () => {
    const { service, products } = makeService();
    const product = await products.create({
      name: "Miniatura teste",
      description: null,
      category: "miniatura_colecionavel",
      createdBy: null,
    });
    // Vincula o cálculo sem copiar as listagens iniciais, para testar a
    // criação de uma listagem nova nesse canal (sugestão: 20 para mercado_livre).
    await products.update(product.id, { priceCalculationId: "calc-1" });

    await expect(
      service.createChannelListing({ productId: product.id, channel: "mercado_livre", listedPrice: 999 }),
    ).rejects.toThrow(/price_override_reason/);
  });

  it("aceita preço divergente do sugerido quando o motivo é informado", async () => {
    const { service, products } = makeService();
    const product = await products.create({
      name: "Miniatura teste",
      description: null,
      category: "miniatura_colecionavel",
      createdBy: null,
    });
    await products.update(product.id, { priceCalculationId: "calc-1" });

    const listing = await service.createChannelListing({
      productId: product.id,
      channel: "mercado_livre",
      listedPrice: 999,
      priceOverrideReason: "Promoção de lançamento",
    });

    expect(listing.listedPrice).toBe(999);
    expect(listing.priceOverrideReason).toBe("Promoção de lançamento");
  });

  it("aceita qualquer preço quando a peça não tem cálculo vinculado", async () => {
    const { service, products } = makeService();
    const product = await products.create({
      name: "Miniatura sem cálculo",
      description: null,
      category: "miniatura_colecionavel",
      createdBy: null,
    });

    const listing = await service.createChannelListing({
      productId: product.id,
      channel: "amazon",
      listedPrice: 50,
    });

    expect(listing.listedPrice).toBe(50);
  });
});

describe("CatalogService.addComponent", () => {
  async function makeComposedFixture() {
    const helpers = makeService();
    const { products } = helpers;
    const mandala = await products.create({ name: "Caixa Mandala", description: null, category: "linha_leon", productType: "composta", createdBy: null });
    const decagono = await products.create({ name: "Decágono", description: null, category: "linha_leon", createdBy: null });
    return { ...helpers, mandala, decagono };
  }

  it("rejeita componente sem ficha de fatiamento nem cálculo de preço salvo", async () => {
    const { service, mandala, decagono } = await makeComposedFixture();
    await expect(service.addComponent(mandala.id, decagono.id, 1, null)).rejects.toThrow(/ficha de fatiamento/);
  });

  it("aceita componente com cálculo de preço salvo", async () => {
    const { service, products, mandala, decagono } = await makeComposedFixture();
    await products.update(decagono.id, { priceCalculationId: "calc-1" });

    const component = await service.addComponent(mandala.id, decagono.id, 1, null);
    expect(component.componentProductId).toBe(decagono.id);
    expect(component.quantity).toBe(1);
  });

  it("aceita componente com ficha de fatiamento cadastrada, mesmo sem cálculo salvo", async () => {
    const { service, slicingSheets, mandala, decagono } = await makeComposedFixture();
    slicingSheets.sheets.push({
      id: "sheet-1",
      productId: decagono.id,
      printerId: "printer-1",
      printHours: 2.25,
      materials: [{ id: "m1", materialId: "mat", pieceGrams: 28.35, supportGrams: 0 }],
      createdBy: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const component = await service.addComponent(mandala.id, decagono.id, 1, null);
    expect(component.componentProductId).toBe(decagono.id);
  });

  it("rejeita uma peça como componente dela mesma", async () => {
    const { service, mandala } = await makeComposedFixture();
    await expect(service.addComponent(mandala.id, mandala.id, 1, null)).rejects.toThrow();
  });

  it("rejeita um ciclo transitivo de composição", async () => {
    const { service, products, mandala, decagono } = await makeComposedFixture();
    await products.update(decagono.id, { priceCalculationId: "calc-1", productType: "composta" });
    await products.update(mandala.id, { priceCalculationId: "calc-1" });

    // decagono (composta) já contém mandala como componente.
    await service.addComponent(decagono.id, mandala.id, 1, null);

    // Adicionar decagono como componente de mandala fecharia o ciclo
    // mandala → decagono → mandala.
    await expect(service.addComponent(mandala.id, decagono.id, 1, null)).rejects.toThrow(/ciclo/);
  });
});

describe("CatalogService.setCoverMedia", () => {
  it("desmarca a capa anterior ao marcar uma nova", async () => {
    const { service, products, productMedia } = makeService();
    const product = await products.create({
      name: "Miniatura teste",
      description: null,
      category: "miniatura_colecionavel",
      createdBy: null,
    });
    const first = await service.addMedia({ productId: product.id, storagePath: "a.jpg", displayOrder: 0 });
    const second = await service.addMedia({ productId: product.id, storagePath: "b.jpg", displayOrder: 1 });

    await service.setCoverMedia(first.id, product.id);
    let media = await productMedia.findByProductId(product.id);
    expect(media.find((m) => m.id === first.id)?.isCover).toBe(true);

    await service.setCoverMedia(second.id, product.id);
    media = await productMedia.findByProductId(product.id);
    expect(media.find((m) => m.id === first.id)?.isCover).toBe(false);
    expect(media.find((m) => m.id === second.id)?.isCover).toBe(true);
    expect(media.filter((m) => m.isCover)).toHaveLength(1);
  });
});

describe("CatalogService.deleteProduct", () => {
  async function makeDeletableProduct(helpers: ReturnType<typeof makeService>) {
    return helpers.products.create({
      name: "Rascunho teste",
      description: null,
      category: "utilitario",
      createdBy: null,
    });
  }

  it("exclui peça sem histórico e limpa os arquivos no Storage", async () => {
    const helpers = makeService();
    const { service, products, productMedia } = helpers;
    const product = await makeDeletableProduct(helpers);
    await service.addMedia({ productId: product.id, storagePath: "a.jpg", displayOrder: 0 });
    await service.addMedia({ productId: product.id, storagePath: "b.jpg", displayOrder: 1 });

    const removed: string[][] = [];
    await service.deleteProduct(product.id, async (paths) => {
      removed.push(paths);
    });

    expect(removed).toEqual([["a.jpg", "b.jpg"]]);
    expect(await products.findById(product.id)).toBeNull();
    // As linhas de product_media saem por cascade no banco real; o fake não
    // simula cascade, então o que importa aqui é o Storage ter sido limpo.
    expect(await productMedia.findByProductId(product.id)).toHaveLength(2);
  });

  it("bloqueia exclusão de peça com item na fila de impressão", async () => {
    const helpers = makeService();
    const { service, products, printQueueItems } = helpers;
    const product = await makeDeletableProduct(helpers);
    printQueueItems.countByProduct.set(product.id, 2);

    await expect(service.deleteProduct(product.id, async () => {})).rejects.toThrow(ProductDeletionBlockedError);
    expect(await products.findById(product.id)).not.toBeNull();
  });

  it("bloqueia exclusão de peça com movimentação de estoque de peças prontas", async () => {
    const helpers = makeService();
    const { service, products, productStockMovements } = helpers;
    const product = await makeDeletableProduct(helpers);
    productStockMovements.countByProduct.set(product.id, 1);

    await expect(service.deleteProduct(product.id, async () => {})).rejects.toThrow(/estoque de peças prontas/);
    expect(await products.findById(product.id)).not.toBeNull();
  });

  it("bloqueia exclusão de peça usada como componente e nomeia a peça composta", async () => {
    const helpers = makeService();
    const { service, products, productComponents } = helpers;
    const component = await makeDeletableProduct(helpers);
    const parent = await products.create({
      name: "Kit Leon",
      description: null,
      category: "linha_leon",
      productType: "composta",
      createdBy: null,
    });
    await productComponents.create({
      parentProductId: parent.id,
      componentProductId: component.id,
      quantity: 2,
      createdBy: null,
    });

    await expect(service.deleteProduct(component.id, async () => {})).rejects.toThrow(/"Kit Leon"/);
    expect(await products.findById(component.id)).not.toBeNull();
  });

  it("não remove a peça se a limpeza do Storage falhar", async () => {
    const helpers = makeService();
    const { service, products } = helpers;
    const product = await makeDeletableProduct(helpers);
    await service.addMedia({ productId: product.id, storagePath: "a.jpg", displayOrder: 0 });

    const storageFailure = service.deleteProduct(product.id, async () => {
      throw new Error("storage indisponível");
    });

    await expect(storageFailure).rejects.toThrow(/storage indisponível/);
    expect(await products.findById(product.id)).not.toBeNull();
  });
});

describe("CatalogService.discontinueProduct", () => {
  it("marca a peça como descontinuada preservando os vínculos", async () => {
    const { service, products, productComponents } = makeService();
    const component = await products.create({
      name: "Base",
      description: null,
      category: "utilitario",
      createdBy: null,
    });
    const parent = await products.create({
      name: "Kit",
      description: null,
      category: "utilitario",
      productType: "composta",
      createdBy: null,
    });
    await productComponents.create({
      parentProductId: parent.id,
      componentProductId: component.id,
      quantity: 1,
      createdBy: null,
    });

    const updated = await service.discontinueProduct(component.id);

    expect(updated.status).toBe("descontinuado");
    expect(await productComponents.findByComponentProductId(component.id)).toHaveLength(1);
  });
});
