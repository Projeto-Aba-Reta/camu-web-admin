"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/producao/catalogo", label: "Catálogo" },
  { href: "/producao/estoque/insumos", label: "Estoque de insumos" },
  { href: "/producao/estoque/pecas", label: "Estoque de peças" },
];

export function ProducaoNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "border-primary text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
