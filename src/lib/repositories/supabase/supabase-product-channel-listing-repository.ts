import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ProductChannelListing } from "@/types/catalog";
import type { MarketplaceChannel } from "@/types/pricing";
import type {
  CreateProductChannelListingInput,
  IProductChannelListingRepository,
  UpdateProductChannelListingInput,
} from "../interfaces/product-channel-listing-repository.interface";

function toProductChannelListing(
  row: Database["public"]["Tables"]["product_channel_listings"]["Row"],
): ProductChannelListing {
  return {
    id: row.id,
    productId: row.product_id,
    channel: row.channel as MarketplaceChannel,
    listedPrice: row.listed_price,
    isActive: row.is_active,
    priceOverrideReason: row.price_override_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseProductChannelListingRepository implements IProductChannelListingRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByProductId(productId: string): Promise<ProductChannelListing[]> {
    const { data, error } = await this.supabase
      .from("product_channel_listings")
      .select("*")
      .eq("product_id", productId);
    if (error) throw error;
    return (data ?? []).map(toProductChannelListing);
  }

  async create(input: CreateProductChannelListingInput): Promise<ProductChannelListing> {
    const { data, error } = await this.supabase
      .from("product_channel_listings")
      .insert({
        product_id: input.productId,
        channel: input.channel,
        listed_price: input.listedPrice,
        price_override_reason: input.priceOverrideReason ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toProductChannelListing(data);
  }

  async update(id: string, input: UpdateProductChannelListingInput): Promise<ProductChannelListing> {
    const { data, error } = await this.supabase
      .from("product_channel_listings")
      .update({
        ...(input.listedPrice !== undefined && { listed_price: input.listedPrice }),
        ...(input.isActive !== undefined && { is_active: input.isActive }),
        ...(input.priceOverrideReason !== undefined && { price_override_reason: input.priceOverrideReason }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toProductChannelListing(data);
  }
}
