import type { ProductComponent } from "@/types/catalog";

export interface CreateProductComponentInput {
  parentProductId: string;
  componentProductId: string;
  quantity: number;
  createdBy: string | null;
}

export interface IProductComponentRepository {
  findByParentId(parentProductId: string): Promise<ProductComponent[]>;
  // Usada pela validação de ciclo (ver design.md decisão 3): percorre a
  // árvore de composição a partir de um produto, sem se importar com
  // quantidade — só com quais peças aparecem, direta ou transitivamente,
  // como componentes.
  findAllByParentIds(parentProductIds: string[]): Promise<ProductComponent[]>;
  create(input: CreateProductComponentInput): Promise<ProductComponent>;
  remove(id: string): Promise<void>;
}
