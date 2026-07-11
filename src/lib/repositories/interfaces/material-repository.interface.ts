import type { Material, MaterialType } from "@/types/inventory";

export interface CreateMaterialInput {
  name: string;
  type: MaterialType;
  unit: string;
  referenceCost: number;
  createdBy: string | null;
}

export interface UpdateMaterialInput {
  name?: string;
  type?: MaterialType;
  unit?: string;
  referenceCost?: number;
}

export interface IMaterialRepository {
  findById(id: string): Promise<Material | null>;
  findAll(): Promise<Material[]>;
  create(input: CreateMaterialInput): Promise<Material>;
  update(id: string, input: UpdateMaterialInput): Promise<Material>;
}
