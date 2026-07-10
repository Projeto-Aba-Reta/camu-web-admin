import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ChannelFee, MarketplaceChannel } from "@/types/pricing";
import type {
  CreateChannelFeeInput,
  IChannelFeeRepository,
} from "../interfaces/channel-fee-repository.interface";

function toChannelFee(row: Database["public"]["Tables"]["channel_fees"]["Row"]): ChannelFee {
  return {
    id: row.id,
    channel: row.channel as MarketplaceChannel,
    percentageFee: row.percentage_fee,
    fixedFee: row.fixed_fee,
    validFrom: row.valid_from,
    createdBy: row.created_by,
  };
}

export class SupabaseChannelFeeRepository implements IChannelFeeRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAllCurrent(): Promise<ChannelFee[]> {
    // Vigência é independente por canal: busca todo o histórico e mantém,
    // por canal, só a linha de maior valid_from.
    const { data, error } = await this.supabase
      .from("channel_fees")
      .select("*")
      .order("channel", { ascending: true })
      .order("valid_from", { ascending: false });
    if (error) throw error;

    const currentByChannel = new Map<string, Database["public"]["Tables"]["channel_fees"]["Row"]>();
    for (const row of data ?? []) {
      if (!currentByChannel.has(row.channel)) currentByChannel.set(row.channel, row);
    }

    return Array.from(currentByChannel.values()).map(toChannelFee);
  }

  async findCurrentForChannel(channel: MarketplaceChannel): Promise<ChannelFee | null> {
    const { data, error } = await this.supabase
      .from("channel_fees")
      .select("*")
      .eq("channel", channel)
      .lte("valid_from", new Date().toISOString())
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toChannelFee(data) : null;
  }

  async findHistoryForChannel(channel: MarketplaceChannel): Promise<ChannelFee[]> {
    const { data, error } = await this.supabase
      .from("channel_fees")
      .select("*")
      .eq("channel", channel)
      .order("valid_from", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toChannelFee);
  }

  async create(input: CreateChannelFeeInput): Promise<ChannelFee> {
    const { data, error } = await this.supabase
      .from("channel_fees")
      .insert({
        channel: input.channel,
        percentage_fee: input.percentageFee,
        fixed_fee: input.fixedFee,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toChannelFee(data);
  }
}
