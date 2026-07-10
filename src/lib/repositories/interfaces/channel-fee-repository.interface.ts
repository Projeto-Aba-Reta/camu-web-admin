import type { ChannelFee, MarketplaceChannel } from "@/types/pricing";

export interface CreateChannelFeeInput {
  channel: MarketplaceChannel;
  percentageFee: number;
  fixedFee: number;
  createdBy: string | null;
}

export interface IChannelFeeRepository {
  findAllCurrent(): Promise<ChannelFee[]>;
  findCurrentForChannel(channel: MarketplaceChannel): Promise<ChannelFee | null>;
  findHistoryForChannel(channel: MarketplaceChannel): Promise<ChannelFee[]>;
  create(input: CreateChannelFeeInput): Promise<ChannelFee>;
}
