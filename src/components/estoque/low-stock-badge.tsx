import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { InventoryService } from "@/lib/services/inventory-service";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteInventory } from "@/lib/auth/inventory-access";

// Visível a Owner/Sócio/producao — mesmo critério de canWriteInventory (ver
// Requirement "Indicador não visível a usuários sem acesso ao domínio de
// Produção" em indicador-de-estoque-baixo). Precificação lê a tela de estoque
// mas não vê este badge.
export async function LowStockBadge() {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canWriteInventory(currentUser)) return null;

  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const inventoryService = new InventoryService(repositories);
  const statuses = await inventoryService.listMaterialStockStatuses();
  const count = statuses.filter((status) => status.isLowStock).length;

  if (count === 0) return null;

  return (
    <Link
      href="/producao/estoque/insumos?lowStock=1"
      className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
    >
      <AlertTriangle className="size-3.5" />
      {count} {count === 1 ? "insumo em estoque baixo" : "insumos em estoque baixo"}
    </Link>
  );
}
