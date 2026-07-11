import type { MaterialMovementType, MaterialType, ProductMovementType } from "@/types/inventory";

export const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  filamento: "Filamento",
  embalagem: "Embalagem",
};

export const MATERIAL_MOVEMENT_TYPE_LABEL: Record<MaterialMovementType, string> = {
  compra: "Compra",
  consumo_producao: "Consumo em produção",
  perda_refugo: "Perda/refugo",
  ajuste_manual: "Ajuste manual",
};

export const PRODUCT_MOVEMENT_TYPE_LABEL: Record<ProductMovementType, string> = {
  producao: "Produção",
  venda: "Venda",
  perda: "Perda",
  ajuste_manual: "Ajuste manual",
};
