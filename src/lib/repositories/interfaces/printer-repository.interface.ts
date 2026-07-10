import type { Printer } from "@/types/pricing";

export interface CreatePrinterInput {
  name: string;
  model: string;
  depreciationPerHour: number;
  createdBy: string | null;
}

export interface IPrinterRepository {
  findActive(): Promise<Printer[]>;
  findById(id: string): Promise<Printer | null>;
  create(input: CreatePrinterInput): Promise<Printer>;
  setActive(id: string, isActive: boolean): Promise<void>;
}
