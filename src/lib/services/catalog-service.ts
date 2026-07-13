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
  "products" | "productMedia" | "productChannelListings" | "priceCalculations" | "productComponents" | "slicingSheets"
>;

export class CatalogService {
  constructor(private readonly repositories: CatalogRepositories) {}

  async createProduct(input: CreateProductInput): Promise<Product> {
    return this.repositories.products.create(input);
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    return this.repositories.products.update(id, input);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.repositories.products.delete(id);
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
