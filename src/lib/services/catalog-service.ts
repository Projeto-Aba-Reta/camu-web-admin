import type { Repositories } from "@/lib/repositories";
import type { CreateProductInput, UpdateProductInput } from "@/lib/repositories/interfaces/product-repository.interface";
import type { CreateProductMediaInput } from "@/lib/repositories/interfaces/product-media-repository.interface";
import type { CreateProductChannelListingInput } from "@/lib/repositories/interfaces/product-channel-listing-repository.interface";
import type { Product, ProductChannelListing, ProductMedia } from "@/types/catalog";
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
  "products" | "productMedia" | "productChannelListings" | "priceCalculations"
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
      ...(!calculation.suggestedTier.ambiguous && { sizeTier: calculation.suggestedTier.tier }),
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
