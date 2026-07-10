"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/financeiro/precificacao/calcular", label: "Calcular preço" },
  { href: "/financeiro/precificacao/historico", label: "Histórico" },
  { href: "/financeiro/precificacao/configuracao", label: "Configuração" },
];

export function PrecificacaoNav() {
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
