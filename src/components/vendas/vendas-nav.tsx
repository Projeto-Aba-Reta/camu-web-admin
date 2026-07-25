import Link from "next/link";
import { cn } from "@/lib/utils";

export type VendasTab = "pedidos" | "funil" | "resultado" | "configuracoes";

interface VendasNavProps {
  activeTab: VendasTab;
  // Abas que o perfil pode abrir. Resultado e Configurações são mais
  // restritas que a área, então não são exibidas para todo mundo que entra.
  visibleTabs: VendasTab[];
}

const TAB_LABEL: Record<VendasTab, string> = {
  pedidos: "Pedidos",
  funil: "Funil",
  resultado: "Resultado",
  configuracoes: "Configurações",
};

const TAB_ORDER: VendasTab[] = ["pedidos", "funil", "resultado", "configuracoes"];

export function VendasNav({ activeTab, visibleTabs }: VendasNavProps) {
  const tabs = TAB_ORDER.filter((tab) => visibleTabs.includes(tab));

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab}
          href={`/vendas/${tab}`}
          className={cn(
            "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            activeTab === tab && "border-primary text-foreground",
          )}
        >
          {TAB_LABEL[tab]}
        </Link>
      ))}
    </nav>
  );
}
