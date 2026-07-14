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
  // Guarda de exclusão de peça: quem usa esta peça como componente. A FK
  // component_product_id é `on delete restrict`. Devolve as linhas, não uma
  // contagem, porque o diálogo nomeia as peças compostas que bloqueiam —
  // um número seco não seria acionável (ver design.md decisão 2).
  findByComponentProductId(componentProductId: string): Promise<ProductComponent[]>;
}
