import type { CostParameters } from "@/types/pricing";

export interface CreateCostParametersInput {
  filamentCostPerKg: number;
  energyCostPerKwh: number;
  averagePowerWatts: number;
  failureReservePct: number;
  packagingCost: number;
  createdBy: string | null;
}

export interface ICostParameterRepository {
  findCurrent(): Promise<CostParameters | null>;
  findById(id: string): Promise<CostParameters | null>;
  findHistory(): Promise<CostParameters[]>;
  create(input: CreateCostParametersInput): Promise<CostParameters>;
}
