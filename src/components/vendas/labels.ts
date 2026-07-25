import type { OrderCostCategory } from "@/types/vendas";

export const ORDER_COST_CATEGORY_LABEL: Record<OrderCostCategory, string> = {
  filamento: "Filamento",
  embalagem: "Embalagem",
  frete: "Frete",
  taxa_canal: "Taxa do canal",
  outros: "Outros",
};

// Pedido sem origem gravada veio da loja do site — a tela rotula, não grava
// (ver design, decisão 1).
export const DEFAULT_ORIGIN_LABEL = "Loja própria";

export const NO_COST_WARNING = "Custo não informado";

// Classes fixas por cor: Tailwind não gera classe a partir de string montada
// em runtime, então o mapa precisa conter os nomes completos.
export const STAGE_COLOR_CLASS: Record<string, string> = {
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function stageColorClass(color: string): string {
  return STAGE_COLOR_CLASS[color] ?? STAGE_COLOR_CLASS.slate;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
