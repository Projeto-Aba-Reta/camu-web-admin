"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PetMiniatureBoard, type PetMiniatureBoardItem } from "@/components/producao/pet-miniature-board";
import { PetMiniatureTable } from "@/components/producao/pet-miniature-table";

interface PetMiniatureViewProps {
  items: PetMiniatureBoardItem[];
  canWrite: boolean;
}

type View = "kanban" | "lista";

export function PetMiniatureView({ items, canWrite }: PetMiniatureViewProps) {
  const [view, setView] = useState<View>("kanban");
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => item.order?.orderCode?.toLowerCase().includes(query));
  }, [items, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border bg-muted/30 p-1 w-fit">
          {(["kanban", "lista"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "capitalize",
                view === option && "bg-background shadow-sm hover:bg-background",
              )}
              onClick={() => setView(option)}
            >
              {option}
            </Button>
          ))}
        </div>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por código do pedido..."
          className="w-64"
        />
      </div>

      {view === "kanban" ? (
        <PetMiniatureBoard items={filteredItems} canWrite={canWrite} />
      ) : (
        <PetMiniatureTable items={filteredItems} canWrite={canWrite} />
      )}
    </div>
  );
}
