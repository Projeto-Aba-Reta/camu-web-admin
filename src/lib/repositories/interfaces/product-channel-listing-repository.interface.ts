import type { ProductChannelListing } from "@/types/catalog";
import type { MarketplaceChannel } from "@/types/pricing";

export interface CreateProductChannelListingInput {
  productId: string;
  channel: MarketplaceChannel;
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
  create(input: CreateProductChannelListingInput): Promise<ProductChannelListing>;
  update(id: string, input: UpdateProductChannelListingInput): Promise<ProductChannelListing>;
}
