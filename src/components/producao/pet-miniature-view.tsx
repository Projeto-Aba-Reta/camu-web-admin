"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-3">
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

      {view === "kanban" ? (
        <PetMiniatureBoard items={items} canWrite={canWrite} />
      ) : (
        <PetMiniatureTable items={items} canWrite={canWrite} />
      )}
    </div>
  );
}
