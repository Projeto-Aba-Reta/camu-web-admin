import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type {
  OrderFinancials,
  SalesOrder,
  SalesOrderItem,
  SalesOrderWithFinancials,
} from "@/types/vendas";
import type {
  CreateSalesOrderInput,
  ISalesOrderRepository,
  MoveSalesOrderInput,
  SalesOrderFilters,
  SalesOrderItemInput,
  UpdateSalesOrderInput,
} from "../interfaces/sales-order-repository.interface";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ItemRow = Database["public"]["Tables"]["order_items"]["Row"];

// Pedido na etapa final sai do quadro depois disto (design, decisão 10).
const BOARD_FINAL_STAGE_DAYS = 30;

function toItem(row: ItemRow): SalesOrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    variant: row.variant,
    unitPriceCents: row.unit_price_cents,
    unitCostCents: row.unit_cost_cents,
    qty: row.qty,
  };
}

function toOrder(row: OrderRow, itemRows: ItemRow[]): SalesOrder {
  return {
    id: row.id,
    orderCode: row.order_code,
    status: row.status,
    paymentStatus: row.payment_status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    addressCep: row.address_cep,
    addressLine: row.address_line,
    addressCity: row.address_city,
    addressUf: row.address_uf,
    saleOriginId: row.sale_origin_id,
    soldByName: row.sold_by_name,
    stageId: row.pipeline_stage_id,
    currentPrinterId: row.current_printer_id,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: itemRows.filter((item) => item.order_id === row.id).map(toItem),
  };
}

// Pedido sem nenhum lançamento de custo não aparece na view com cost_entries
// > 0; a ausência de linha é tratada como "custo não informado", não como
// custo zero confirmado.
function emptyFinancials(order: OrderRow): OrderFinancials {
  return {
    orderId: order.id,
    revenueCents: order.total_cents,
    costCents: 0,
    profitCents: order.total_cents,
    costEntries: 0,
  };
}

function toItemInsert(orderId: string, item: SalesOrderItemInput) {
  return {
    order_id: orderId,
    product_id: item.productId,
    product_name: item.productName,
    variant: item.variant,
    unit_price_cents: item.unitPriceCents,
    unit_cost_cents: item.unitCostCents,
    qty: item.qty,
  };
}

export class SupabaseSalesOrderRepository implements ISalesOrderRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private async findItems(orderIds: string[]): Promise<ItemRow[]> {
    if (orderIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  // Receita/custo/lucro vêm da view em uma consulta separada por lote — sem
  // isto a listagem faria uma consulta de custo por pedido.
  private async findFinancials(orderIds: string[]): Promise<Map<string, OrderFinancials>> {
    const byOrderId = new Map<string, OrderFinancials>();
    if (orderIds.length === 0) return byOrderId;

    const { data, error } = await this.supabase
      .from("order_financials")
      .select("*")
      .in("order_id", orderIds);
    if (error) throw error;

    for (const row of data ?? []) {
      if (!row.order_id) continue;
      byOrderId.set(row.order_id, {
        orderId: row.order_id,
        revenueCents: row.revenue_cents ?? 0,
        costCents: row.cost_cents ?? 0,
        profitCents: row.profit_cents ?? 0,
        costEntries: row.cost_entries ?? 0,
      });
    }
    return byOrderId;
  }

  private async hydrate(rows: OrderRow[]): Promise<SalesOrderWithFinancials[]> {
    const orderIds = rows.map((row) => row.id);
    const [itemRows, financialsByOrderId] = await Promise.all([
      this.findItems(orderIds),
      this.findFinancials(orderIds),
    ]);

    return rows.map((row) => ({
      ...toOrder(row, itemRows),
      financials: financialsByOrderId.get(row.id) ?? emptyFinancials(row),
    }));
  }

  async list(filters: SalesOrderFilters = {}): Promise<SalesOrderWithFinancials[]> {
    let query = this.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
    // O filtro de período trabalha em dias, então o limite superior precisa
    // cobrir o dia inteiro — created_at é timestamptz.
    if (filters.createdTo) query = query.lte("created_at", `${filters.createdTo}T23:59:59.999Z`);
    if (filters.saleOriginId) query = query.eq("sale_origin_id", filters.saleOriginId);
    if (filters.soldByName) query = query.ilike("sold_by_name", `%${filters.soldByName}%`);
    if (filters.stageId) query = query.eq("pipeline_stage_id", filters.stageId);

    const { data, error } = await query;
    if (error) throw error;
    return this.hydrate(data ?? []);
  }

  async listForBoard(includeArchivedFinal: boolean): Promise<SalesOrderWithFinancials[]> {
    let query = this.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!includeArchivedFinal) {
      const { data: finalStages, error: stageError } = await this.supabase
        .from("order_pipeline_stages")
        .select("id")
        .eq("is_final", true);
      if (stageError) throw stageError;

      const finalStageIds = (finalStages ?? []).map((stage) => stage.id);
      if (finalStageIds.length > 0) {
        const cutoff = new Date(
          Date.now() - BOARD_FINAL_STAGE_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        // Fica no quadro: o que não está em etapa final, o que ainda não tem
        // etapa (não deveria acontecer, o trigger preenche) e o que entrou na
        // final há menos de 30 dias.
        query = query.or(
          `pipeline_stage_id.not.in.(${finalStageIds.join(",")}),pipeline_stage_id.is.null,updated_at.gte.${cutoff}`,
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return this.hydrate(data ?? []);
  }

  async findById(id: string): Promise<SalesOrderWithFinancials | null> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const [hydrated] = await this.hydrate([data]);
    return hydrated ?? null;
  }

  // Distinct feito aqui e não no banco: o PostgREST não expõe `distinct`, e a
  // lista de vendedores é curta o bastante para deduplicar em memória.
  async listSellerNames(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("orders")
      .select("sold_by_name")
      .not("sold_by_name", "is", null);
    if (error) throw error;

    const names = new Set<string>();
    for (const row of data ?? []) {
      if (row.sold_by_name) names.add(row.sold_by_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const { data, error } = await this.supabase
      .from("orders")
      .insert({
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
        address_cep: input.addressCep,
        address_line: input.addressLine,
        address_city: input.addressCity,
        address_uf: input.addressUf,
        sale_origin_id: input.saleOriginId,
        sold_by_name: input.soldByName,
        pipeline_stage_id: input.stageId,
        subtotal_cents: input.subtotalCents,
        shipping_cents: input.shippingCents,
        total_cents: input.totalCents,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { error: itemsError } = await this.supabase
      .from("order_items")
      .insert(input.items.map((item) => toItemInsert(data.id, item)));
    if (itemsError) throw itemsError;

    return toOrder(data, await this.findItems([data.id]));
  }

  async update(id: string, input: UpdateSalesOrderInput): Promise<SalesOrder> {
    const patch: Database["public"]["Tables"]["orders"]["Update"] = {};
    if (input.customerName !== undefined) patch.customer_name = input.customerName;
    if (input.customerEmail !== undefined) patch.customer_email = input.customerEmail;
    if (input.customerPhone !== undefined) patch.customer_phone = input.customerPhone;
    if (input.addressCep !== undefined) patch.address_cep = input.addressCep;
    if (input.addressLine !== undefined) patch.address_line = input.addressLine;
    if (input.addressCity !== undefined) patch.address_city = input.addressCity;
    if (input.addressUf !== undefined) patch.address_uf = input.addressUf;
    if (input.saleOriginId !== undefined) patch.sale_origin_id = input.saleOriginId;
    if (input.soldByName !== undefined) patch.sold_by_name = input.soldByName;
    if (input.shippingCents !== undefined) patch.shipping_cents = input.shippingCents;
    if (input.subtotalCents !== undefined) patch.subtotal_cents = input.subtotalCents;
    if (input.totalCents !== undefined) patch.total_cents = input.totalCents;

    const { data, error } = await this.supabase
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    // Itens são substituídos em bloco: a tela edita a lista inteira, e casar
    // item a item exigiria identidade estável que o formulário não tem.
    if (input.items !== undefined) {
      const { error: deleteError } = await this.supabase
        .from("order_items")
        .delete()
        .eq("order_id", id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await this.supabase
        .from("order_items")
        .insert(input.items.map((item) => toItemInsert(id, item)));
      if (insertError) throw insertError;
    }

    return toOrder(data, await this.findItems([id]));
  }

  async move(id: string, input: MoveSalesOrderInput): Promise<SalesOrder> {
    const { data, error } = await this.supabase
      .from("orders")
      .update({
        pipeline_stage_id: input.stageId,
        current_printer_id: input.currentPrinterId,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toOrder(data, await this.findItems([id]));
  }

  async delete(id: string): Promise<void> {
    // Itens, custos e eventos de etapa saem por cascade (ver migration).
    const { error } = await this.supabase.from("orders").delete().eq("id", id);
    if (error) throw error;
  }
}
