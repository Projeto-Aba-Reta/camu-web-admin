import type { SaleOrigin } from "@/types/vendas";

export interface CreateSaleOriginInput {
  slug: string;
  name: string;
  sortOrder: number;
  requiresSeller: boolean;
  createdBy: string | null;
}

export interface UpdateSaleOriginInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  requiresSeller?: boolean;
}

export interface ISaleOriginRepository {
  // Sem argumento retorna todas (o cadastro precisa ver as arquivadas);
  // com `true` só as ativas, que é o que o formulário de pedido oferece.
  listAll(onlyActive?: boolean): Promise<SaleOrigin[]>;
  findById(id: string): Promise<SaleOrigin | null>;
  findBySlug(slug: string): Promise<SaleOrigin | null>;
  create(input: CreateSaleOriginInput): Promise<SaleOrigin>;
  update(id: string, input: UpdateSaleOriginInput): Promise<SaleOrigin>;
  delete(id: string): Promise<void>;
  // Quantos pedidos referenciam esta origem — o que decide entre arquivar e
  // poder excluir.
  countOrders(id: string): Promise<number>;
}
