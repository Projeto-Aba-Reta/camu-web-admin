"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setSidebarScope } from "@/app/(dashboard)/actions";

interface AreaScopeToggleProps {
  isAllScope: boolean;
}

export function AreaScopeToggle({ isAllScope }: AreaScopeToggleProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      await setSidebarScope(checked ? "all" : "own");
    });
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Switch
        id="area-scope-toggle"
        checked={isAllScope}
        onCheckedChange={handleChange}
        disabled={isPending}
        className="data-[state=checked]:bg-sidebar-primary"
      />
      <label
        htmlFor="area-scope-toggle"
        className="cursor-pointer select-none text-xs text-sidebar-foreground/70"
      >
        Ver todas as áreas
      </label>
    </div>
  );
}
