import Link from "next/link";
import { cn } from "@/lib/utils";

export type MarketingView = "calendario" | "board";

interface MarketingViewTabsProps {
  activeView: MarketingView;
  year: number;
  month: number;
}

// Mesmo visual da ProducaoNav, mas alternando a visão via query string em
// vez de rota — as duas visões olham para os mesmos itens.
export function MarketingViewTabs({ activeView, year, month }: MarketingViewTabsProps) {
  const mes = `${year}-${month.toString().padStart(2, "0")}`;
  const tabs: { view: MarketingView; label: string }[] = [
    { view: "calendario", label: "Calendário" },
    { view: "board", label: "Board por status" },
  ];

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          href={`/marketing/calendario?mes=${mes}&view=${tab.view}`}
          className={cn(
            "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            activeView === tab.view && "border-primary text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
