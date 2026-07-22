import type { ProductChannelListing } from "@/types/catalog";
import type { SalesChannel } from "@/types/pricing";

export interface CreateProductChannelListingInput {
  productId: string;
  channel: SalesChannel;
  listedPrice: number;
  priceOverrideReason?: string | null;
}

export interface UpdateProductChannelListingInput {
  listedPrice?: number;
  isActive?: boolean;
  priceOverrideReason?: string | null;
}

export interface IProductChannelListingRepository {
  findByProductId(productId: string): Promise<ProductChannelListing[]>;
  // Todas as listagens de um canal, de uma vez: a listagem do catálogo
  // precisa saber quais peças estão publicadas no site sem uma consulta por
  // peça.
  findByChannel(channel: SalesChannel): Promise<ProductChannelListing[]>;
  create(input: CreateProductChannelListingInput): Promise<ProductChannelListing>;
  update(id: string, input: UpdateProductChannelListingInput): Promise<ProductChannelListing>;
}
