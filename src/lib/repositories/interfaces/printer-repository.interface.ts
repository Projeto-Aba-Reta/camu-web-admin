import type { Printer } from "@/types/pricing";

export interface CreatePrinterInput {
  name: string;
  model: string;
  depreciationPerHour: number;
  createdBy: string | null;
}

export interface IPrinterRepository {
  findActive(): Promise<Printer[]>;
  // Todas as versões de todas as impressoras (ativas e inativas), ordenadas
  // por nome e por vigência decrescente — usada pela tela de configuração
  // para montar o cadastro atual + histórico por máquina.
  findAll(): Promise<Printer[]>;
  findById(id: string): Promise<Printer | null>;
  create(input: CreatePrinterInput): Promise<Printer>;
  setActive(id: string, isActive: boolean): Promise<void>;
}
