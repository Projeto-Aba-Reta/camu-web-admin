import type { Repositories } from "@/lib/repositories";
import type { CreateProductInput, UpdateProductInput } from "@/lib/repositories/interfaces/product-repository.interface";
import type { CreateProductMediaInput } from "@/lib/repositories/interfaces/product-media-repository.interface";
import type { CreateProductChannelListingInput } from "@/lib/repositories/interfaces/product-channel-listing-repository.interface";
import type { Product, ProductChannelListing, ProductComponent, ProductMedia } from "@/types/catalog";
import type { PriceCalculation } from "@/types/pricing";

function suggestedPriceForChannel(calculation: PriceCalculation, channel: string): number | null {
  const match = calculation.channelPrices.find((cp) => cp.channel === channel);
  return match ? match.suggestedPrice : null;
}

// Preço com centavos arredondados diverge do sugerido (ver design.md
// decisão 2 e migration: mesmo critério do trigger de banco).
function pricesDiverge(listedPrice: number, suggestedPrice: number): boolean {
  return Math.round(listedPrice * 100) !== Math.round(suggestedPrice * 100);
}

type CatalogRepositories = Pick<
  Repositories,
  | "products"
  | "productMedia"
  | "productChannelListings"
  | "priceCalculations"
  | "productComponents"
  | "slicingSheets"
  | "printQueueItems"
  | "productStockMovements"
  | "materialStockMovements"
>;

// Registros que impedem a exclusão de uma peça — as FKs correspondentes são
// `restrict`/`no action` no banco, porque histórico produtivo e contábil é
// imutável (ver design.md decisão 1). Mídia, listagens de canal e fichas de
// fatiamento não aparecem aqui: saem em cascata junto com a peça.
export interface ProductDependencies {
  printQueueItems: number;
  productStockMovements: number;
  materialStockMovements: number;
  usedAsComponentIn: ProductComponent[];
}

export function hasBlockingDependencies(dependencies: ProductDependencies): boolean {
  return (
    dependencies.printQueueItems > 0 ||
    dependencies.productStockMovements > 0 ||
    dependencies.materialStockMovements > 0 ||
    dependencies.usedAsComponentIn.length > 0
  );
}

export class ProductDeletionBlockedError extends Error {
  constructor(
    message: string,
    readonly dependencies: ProductDependencies,
  ) {
    super(message);
    this.name = "ProductDeletionBlockedError";
  }
}

// O que o diálogo de exclusão precisa saber, já em forma renderizável: se dá
// para excluir, o que impede (frases prontas, com as peças compostas
// nomeadas) e o que sairia em cascata junto. Calculado sob demanda ao abrir
// o diálogo, não para a listagem inteira (ver design.md decisão 4).
export interface ProductDeletionCheck {
  canDelete: boolean;
  blockers: string[];
  cascade: {
    media: number;
    channelListings: number;
    slicingSheets: number;
  };
}

// Remove os objetos da peça no bucket `product-media`. Injetado pela Server
// Action porque o Storage não é um repositório — o service não conhece o
// cliente Supabase.
export type RemoveStorageObjects = (storagePaths: string[]) => Promise<void>;

export class CatalogService {
  constructor(private readonly repositories: CatalogRepositories) {}

  async createProduct(input: CreateProductInput): Promise<Product> {
    return this.repositories.products.create(input);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    return this.repositories.products.update(id, input);
  }

  async getProductDependencies(productId: string): Promise<ProductDependencies> {
    const [printQueueItems, productStockMovements, materialStockMovements, usedAsComponentIn] = await Promise.all([
      this.repositories.printQueueItems.countByProductId(productId),
      this.repositories.productStockMovements.countByProductId(productId),
      this.repositories.materialStockMovements.countByProductId(productId),
      this.repositories.productComponents.findByComponentProductId(productId),
    ]);

    return { printQueueItems, productStockMovements, materialStockMovements, usedAsComponentIn };
  }

  // Exclusão permanente, permitida só para peças sem histórico dependente
  // (ver Requirement "Exclusão de peça sem histórico dependente"). O cascade
  // do banco leva mídia, listagens de canal e fichas de fatiamento; os
  // objetos no Storage não são alcançados pelo cascade e por isso saem aqui.
  //
  // Storage antes do banco (ver design.md decisão 3): se a remoção dos
  // arquivos falhar, abortamos com a peça íntegra. Na ordem inversa, uma
  // falha deixaria arquivos órfãos sem nenhum registro que os aponte.
  async getDeletionCheck(productId: string): Promise<ProductDeletionCheck> {
    const [dependencies, media, channelListings, slicingSheets] = await Promise.all([
      this.getProductDependencies(productId),
      this.repositories.productMedia.findByProductId(productId),
      this.repositories.productChannelListings.findByProductId(productId),
      this.repositories.slicingSheets.findByProductId(productId),
    ]);

    return {
      canDelete: !hasBlockingDependencies(dependencies),
      blockers: await this.describeBlockers(dependencies),
      cascade: {
        media: media.length,
        channelListings: channelListings.length,
        slicingSheets: slicingSheets.length,
      },
    };
  }

  async deleteProduct(id: string, removeStorageObjects: RemoveStorageObjects): Promise<void> {
    const dependencies = await this.getProductDependencies(id);
    if (hasBlockingDependencies(dependencies)) {
      const blockers = await this.describeBlockers(dependencies);
      throw new ProductDeletionBlockedError(
        `Esta peça não pode ser excluída porque tem histórico: ${blockers.join("; ")}. Você pode descontinuá-la.`,
        dependencies,
      );
    }

    const media = await this.repositories.productMedia.findByProductId(id);
    const storagePaths = media.map((item) => item.storagePath);
    if (storagePaths.length > 0) {
      await removeStorageObjects(storagePaths);
    }

    await this.repositories.products.delete(id);
  }

  // Alternativa oferecida quando a exclusão é bloqueada: a peça some do
  // catálogo ativo e todo o histórico dependente permanece intacto (ver
  // Requirement "Descontinuar como alternativa à exclusão").
  async discontinueProduct(id: string): Promise<Product> {
    return this.repositories.products.update(id, { status: "descontinuado" });
  }

  // Uma frase por vínculo impeditivo. As peças compostas são nomeadas porque
  // a ação corretiva depende disso ("remova o componente de X primeiro") —
  // um número seco não seria acionável.
  private async describeBlockers(dependencies: ProductDependencies): Promise<string[]> {
    const blockers: string[] = [];

    if (dependencies.printQueueItems > 0) {
      blockers.push(`${dependencies.printQueueItems} item(ns) na fila de impressão`);
    }
    if (dependencies.productStockMovements > 0) {
      blockers.push(`${dependencies.productStockMovements} movimentação(ões) de estoque de peças prontas`);
    }
    if (dependencies.materialStockMovements > 0) {
      blockers.push(`${dependencies.materialStockMovements} movimentação(ões) de estoque de insumos`);
    }
    if (dependencies.usedAsComponentIn.length > 0) {
      const parents = await Promise.all(
        dependencies.usedAsComponentIn.map((component) => this.repositories.products.findById(component.parentProductId)),
      );
      const names = parents.filter((parent): parent is Product => parent !== null).map((parent) => `"${parent.name}"`);
      blockers.push(`usada como componente de ${names.length > 0 ? names.join(", ") : "outra(s) peça(s)"}`);
    }

    return blockers;
  }

  // Vincula a peça a um cálculo de preço existente e copia a sugestão
  // inicial (porte e preço por canal) para o catálogo, sem alterar o
  // registro de cálculo original (ver Requirement "Vínculo opcional com
  // cálculo de preço" e design.md decisão 2). Canais que já têm listagem
  // própria não são sobrescritos — a cópia é só o valor inicial.
  async linkPriceCalculation(productId: string, priceCalculationId: string): Promise<Product> {
    const calculation = await this.repositories.priceCalculations.findById(priceCalculationId);
    if (!calculation) {
      throw new Error(`Cálculo de preço ${priceCalculationId} não encontrado.`);
    }

    const existingListings = await this.repositories.productChannelListings.findByProductId(productId);
    const listedChannels = new Set(existingListings.map((listing) => listing.channel));

    await Promise.all(
      calculation.channelPrices
        .filter((channelPrice) => !listedChannels.has(channelPrice.channel))
        .map((channelPrice) =>
          this.repositories.productChannelListings.create({
            productId,
            channel: channelPrice.channel,
            listedPrice: channelPrice.suggestedPrice,
          }),
        ),
    );

    return this.repositories.products.update(productId, {
      priceCalculationId,
      ...(calculation.suggestedTier &&
        !calculation.suggestedTier.ambiguous && { sizeTier: calculation.suggestedTier.tier }),
    });
  }

  async addMedia(input: CreateProductMediaInput): Promise<ProductMedia> {
    return this.repositories.productMedia.create(input);
  }

  // Marcar uma nova capa desmarca a anterior automaticamente (ver
  // Requirement "No máximo uma foto de capa por peça").
  async setCoverMedia(mediaId: string, productId: string): Promise<void> {
    return this.repositories.productMedia.setCover(mediaId, productId);
  }

  async removeMedia(id: string): Promise<void> {
    return this.repositories.productMedia.delete(id);
  }

  // Exige motivo de divergência quando o preço informado difere do preço
  // sugerido pelo cálculo vinculado à peça (ver Requirement "Motivo
  // obrigatório quando o preço diverge do sugerido"). Sem cálculo vinculado,
  // não há sugestão para comparar — qualquer preço é aceito.
  async createChannelListing(input: CreateProductChannelListingInput): Promise<ProductChannelListing> {
    await this.assertPriceOverrideReasonIfNeeded(input.productId, input.channel, input.listedPrice, input.priceOverrideReason);
    return this.repositories.productChannelListings.create(input);
  }

  async updateChannelListingPrice(
    productId: string,
    listingId: string,
    channel: string,
    listedPrice: number,
    priceOverrideReason: string | null | undefined,
  ): Promise<ProductChannelListing> {
    await this.assertPriceOverrideReasonIfNeeded(productId, channel, listedPrice, priceOverrideReason);
    return this.repositories.productChannelListings.update(listingId, { listedPrice, priceOverrideReason });
  }

  async listComponents(parentProductId: string): Promise<ProductComponent[]> {
    return this.repositories.productComponents.findByParentId(parentProductId);
  }

  // Adiciona um componente a uma peça composta, validando (ver Requirements
  // "Componente exige custo conhecido antes de ser adicionado" e
  // "Composição sem ciclos" de composicao-de-produto):
  // 1. o componente já tem ficha de fatiamento ou cálculo de preço salvo;
  // 2. adicionar esse vínculo não cria um ciclo (parent contido, direta ou
  //    transitivamente, dentro do próprio componente).
  async addComponent(
    parentProductId: string,
    componentProductId: string,
    quantity: number,
    createdBy: string | null,
  ): Promise<ProductComponent> {
    if (parentProductId === componentProductId) {
      throw new Error("Uma peça não pode ser componente dela mesma.");
    }

    const component = await this.repositories.products.findById(componentProductId);
    if (!component) {
      throw new Error(`Peça componente ${componentProductId} não encontrada.`);
    }

    const hasKnownCost = Boolean(component.priceCalculationId);
    const hasSlicingSheet = hasKnownCost
      ? true
      : (await this.repositories.slicingSheets.findByProductId(componentProductId)).length > 0;
    if (!hasKnownCost && !hasSlicingSheet) {
      throw new Error(
        `Peça "${component.name}" não tem ficha de fatiamento nem cálculo de preço salvo — cadastre um dos dois antes de usá-la como componente.`,
      );
    }

    if (await this.wouldCreateCycle(parentProductId, componentProductId)) {
      throw new Error(`Adicionar "${component.name}" como componente criaria um ciclo de composição.`);
    }

    return this.repositories.productComponents.create({
      parentProductId,
      componentProductId,
      quantity,
      createdBy,
    });
  }

  async removeComponent(id: string): Promise<void> {
    return this.repositories.productComponents.remove(id);
  }

  // Verdadeiro se parentProductId já é alcançável a partir de
  // componentProductId percorrendo a árvore de composição (ou seja, se
  // componentProductId contém, direta ou transitivamente, parentProductId) —
  // nesse caso, adicionar o vínculo parent → component fecharia um ciclo.
  private async wouldCreateCycle(parentProductId: string, componentProductId: string): Promise<boolean> {
    let frontier = [componentProductId];
    const visited = new Set<string>();

    while (frontier.length > 0) {
      const children = await this.repositories.productComponents.findAllByParentIds(frontier);
      const nextFrontier: string[] = [];

      for (const child of children) {
        if (child.componentProductId === parentProductId) return true;
        if (!visited.has(child.componentProductId)) {
          visited.add(child.componentProductId);
          nextFrontier.push(child.componentProductId);
        }
      }

      frontier = nextFrontier;
    }

    return false;
  }

  private async assertPriceOverrideReasonIfNeeded(
    productId: string,
    channel: string,
    listedPrice: number,
    priceOverrideReason: string | null | undefined,
  ): Promise<void> {
    const product = await this.repositories.products.findById(productId);
    if (!product?.priceCalculationId) return;

    const calculation = await this.repositories.priceCalculations.findById(product.priceCalculationId);
    if (!calculation) return;

    const suggestedPrice = suggestedPriceForChannel(calculation, channel);
    if (suggestedPrice === null) return;

    if (pricesDiverge(listedPrice, suggestedPrice) && !priceOverrideReason?.trim()) {
      throw new Error(
        `price_override_reason é obrigatório: preço informado (${listedPrice}) diverge do sugerido (${suggestedPrice}).`,
      );
    }
  }
}
