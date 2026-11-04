"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  duplicateStoreProductAction,
  setStoreProductStatusAction,
} from "@/app/(dashboard)/vitrine/actions";
import { STATUS_LABEL, type StoreProduct } from "@/lib/vitrine/types";
import { formatBRL } from "./money-input";

type Item = StoreProduct & { coverPath: string | null };

export function StoreProductGrid({
  products,
  imageBaseUrl,
  siteUrl,
}: {
  products: Item[];
  imageBaseUrl: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const visible = products.filter(
    (p) =>
      (!status || p.status === status) && (!query || p.title.toLowerCase().includes(query.toLowerCase())),
  );

  function run(action: () => Promise<{ ok: boolean; error?: string; productId?: string }>, okMsg: string) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        toast.error(r.error ?? "Falhou.");
        return;
      }
      toast.success(okMsg);
      if (r.productId) router.push(`/vitrine/${r.productId}`);
      else router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum produto ainda. Clique em &quot;Novo produto&quot; para começar.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Buscar produto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {(["", "publicado", "rascunho", "arquivado"] as const).map((s) => (
          <Button
            key={s || "todos"}
            type="button"
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s ? STATUS_LABEL[s] : "Todos"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-md border">
            <Link href={`/vitrine/${p.id}`} className="block">
              <div className="aspect-square bg-muted">
                {p.coverPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${imageBaseUrl}/${p.coverPath}`} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    sem foto
                  </div>
                )}
              </div>
              <div className="space-y-1 p-3">
                <div className="line-clamp-2 text-sm font-medium">{p.title}</div>
                <div className="text-sm text-muted-foreground">{formatBRL(p.priceCents)}</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={p.status === "publicado" ? "secondary" : "outline"}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                  {p.featuredRank != null && <Badge variant="outline">Destaque</Badge>}
                </div>
              </div>
            </Link>
            <div className="flex flex-wrap gap-1 border-t p-2">
              {p.status === "publicado" ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => setStoreProductStatusAction(p.id, "rascunho"), "Despublicado.")}
                  >
                    Despublicar
                  </Button>
                  {siteUrl && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`${siteUrl}/loja/${p.slug}`} target="_blank" rel="noreferrer">
                        Ver no site
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setStoreProductStatusAction(p.id, "publicado"), "Publicado.")}
                >
                  Publicar
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => duplicateStoreProductAction(p.id), "Duplicado.")}
              >
                Duplicar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
