import type { SizeTierDefinition } from "@/types/pricing";

export interface CreateSizeTierInput {
  code: string;
  label: string;
  sortOrder: number;
  createdBy: string | null;
}

export interface UpdateSizeTierInput {
  label: string;
  sortOrder: number;
}

export interface ISizeTierRepository {
  // Ordenado por sort_order (a ordem da régua de tamanho), depois por código.
  findAll(): Promise<SizeTierDefinition[]>;
  findByCode(code: string): Promise<SizeTierDefinition | null>;
  create(input: CreateSizeTierInput): Promise<SizeTierDefinition>;
  // Só nome e ordem: o código é identidade imutável e is_system é fixo.
  update(code: string, input: UpdateSizeTierInput): Promise<SizeTierDefinition>;
  remove(code: string): Promise<void>;
  // Quantas peças e faixas referenciam o porte — usado para barrar a remoção
  // de um porte em uso (ver Requirement "Remoção de porte personalizado sem
  // referências").
  countReferences(code: string): Promise<number>;
}
