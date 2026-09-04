import { PetMiniatureCard } from "@/components/producao/pet-miniature-card";
import {
  PET_MINIATURE_TIMELINE_STAGES,
  resolvePetMiniatureTimelineStage,
} from "@/lib/pet-miniature/timeline";
import type { PetMiniatureRequest } from "@/types/pet-miniature";
import type { SalesOrderWithFinancials } from "@/types/vendas";

export interface PetMiniatureBoardItem {
  request: PetMiniatureRequest;
  order: SalesOrderWithFinancials | null;
}

interface PetMiniatureBoardProps {
  items: PetMiniatureBoardItem[];
  canWrite: boolean;
}

export function PetMiniatureBoard({ items, canWrite }: PetMiniatureBoardProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {PET_MINIATURE_TIMELINE_STAGES.map((stage) => {
          const columnItems = items.filter(
            (item) =>
              resolvePetMiniatureTimelineStage(item.request, item.order?.status ?? null) === stage.slug,
          );

          return (
            <div
              key={stage.slug}
              className="flex w-72 shrink-0 flex-col gap-2 rounded-md border bg-muted/30 p-2"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium">{stage.label}</h3>
                <span className="text-xs text-muted-foreground">{columnItems.length}</span>
              </div>

              {columnItems.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nenhuma encomenda.</p>
              ) : (
                columnItems.map((item) => (
                  <PetMiniatureCard
                    key={item.request.id}
                    request={item.request}
                    order={item.order}
                    canWrite={canWrite}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
