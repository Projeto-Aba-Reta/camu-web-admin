"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Settings,
  Layers,
  DollarSign,
  Package,
  Users,
  BarChart2,
  FileText,
  LayoutDashboard,
  Shield,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarItem } from "@/lib/navigation/build-sidebar";

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  settings: Settings,
  precificacao: DollarSign,
  producao: Package,
  vendas: Users,
  assinatura: BarChart2,
  societario: FileText,
  "layout-dashboard": LayoutDashboard,
  users: Users,
  shield: Shield,
  "file-text": FileText,
  mail: Mail,
};

function resolveIcon(item: SidebarItem): LucideIcon {
  if (item.icon && item.icon in ICON_MAP) return ICON_MAP[item.icon];
  if (item.slug in ICON_MAP) return ICON_MAP[item.slug];
  return Layers;
}

interface SidebarNavItemProps {
  item: SidebarItem;
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : item.href !== undefined && pathname.startsWith(item.href);

  const Icon = resolveIcon(item);

  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </>
  );

  const baseClass = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-sidebar-accent text-sidebar-primary"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    !item.href && "cursor-default opacity-50"
  );

  if (!item.href) {
    return <div className={baseClass}>{content}</div>;
  }

  return (
    <Link href={item.href} className={baseClass}>
      {content}
    </Link>
  );
}
