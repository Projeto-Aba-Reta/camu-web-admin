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
  // Histórico de todos os canais juntos, ordenado por canal e por vigência
  // decrescente — usado pela tela de configuração.
  findAllHistory(): Promise<ChannelFee[]>;
  create(input: CreateChannelFeeInput): Promise<ChannelFee>;
}
