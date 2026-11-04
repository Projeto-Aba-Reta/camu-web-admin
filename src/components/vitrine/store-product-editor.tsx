"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteStoreProductAction,
  setStoreProductFeaturedAction,
  setStoreProductStatusAction,
  updateStoreProductAction,
} from "@/app/(dashboard)/vitrine/actions";
import {
  BADGE_OPTIONS,
  STATUS_LABEL,
  type StoreFulfillment,
  type StoreProductDetail,
  type StoreReadiness,
} from "@/lib/vitrine/types";
import { centsToReaisInput, parseReaisToCents } from "./money-input";
import { StoreMediaManager } from "./store-media-manager";
import { StoreVariantsManager } from "./store-variants-manager";

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="rounded-md border">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">{title}</summary>
      <div className="space-y-4 border-t p-4">{children}</div>
    </details>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const numOrNull = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Math.floor(Number(v)) || 0));

export function StoreProductEditor({
  product,
  readiness,
  imageBaseUrl,
  siteUrl,
}: {
  product: StoreProductDetail;
  readiness: StoreReadiness;
  imageBaseUrl: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(product.title);
  const [slug, setSlug] = useState(product.slug);
  const [price, setPrice] = useState(centsToReaisInput(product.priceCents));
  const [compareAt, setCompareAt] = useState(centsToReaisInput(product.compareAtPriceCents));
  const [shortDescription, setShortDescription] = useState(product.shortDescription ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [highlights, setHighlights] = useState(product.highlights.join("\n"));
  const [badges, setBadges] = useState<string[]>(product.badges);
  const [category, setCategory] = useState(product.category ?? "");
  const [fulfillment, setFulfillment] = useState<StoreFulfillment>(product.fulfillment);
  const [leadMin, setLeadMin] = useState(product.leadDaysMin?.toString() ?? "");
  const [leadMax, setLeadMax] = useState(product.leadDaysMax?.toString() ?? "");
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(product.seoDescription ?? "");

  function save() {
    startTransition(async () => {
      const r = await updateStoreProductAction(product.id, {
        title,
        slug,
        shortDescription: shortDescription || null,
        description: description || null,
        priceCents: parseReaisToCents(price) ?? 0,
        compareAtPriceCents: parseReaisToCents(compareAt),
        category: category || null,
        badges,
        highlights: highlights.split("\n"),
        fulfillment,
        leadDaysMin: numOrNull(leadMin),
        leadDaysMax: numOrNull(leadMax),
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      });
      if (!r.ok) { toast.error(r.error ?? "Não foi possível salvar."); return; }
      toast.success("Salvo.");
      router.refresh();
    });
  }

  function changeStatus(status: "publicado" | "rascunho" | "arquivado") {
    startTransition(async () => {
      const r = await setStoreProductStatusAction(product.id, status);
      if (!r.ok) { toast.error(r.error ?? "Não foi possível alterar o status."); return; }
      toast.success(status === "publicado" ? "Publicado na loja." : "Status atualizado.");
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Excluir este produto e suas fotos? Pedidos antigos continuam no histórico.")) return;
    startTransition(async () => {
      const r = await deleteStoreProductAction(product.id);
      if (!r.ok) { toast.error(r.error ?? "Não foi possível excluir."); return; }
      router.push("/vitrine");
    });
  }

  function toggleFeatured() {
    startTransition(async () => {
      const r = await setStoreProductFeaturedAction(product.id, product.featuredRank == null);
      if (!r.ok) { toast.error(r.error ?? "Não foi possível alterar."); return; }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* barra de estado */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
        <Badge variant={product.status === "publicado" ? "secondary" : "outline"}>{STATUS_LABEL[product.status]}</Badge>
        {!readiness.ok && (
          <span className="text-xs text-destructive">Para publicar falta: {readiness.missing.join(", ")}.</span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {product.status === "publicado" && siteUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={`${siteUrl}/loja/${product.slug}`} target="_blank" rel="noreferrer">
                Ver no site
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={pending} onClick={toggleFeatured}>
            {product.featuredRank == null ? "Destacar" : "Remover destaque"}
          </Button>
          {product.status === "publicado" ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => changeStatus("rascunho")}>
              Despublicar
            </Button>
          ) : (
            <Button size="sm" disabled={pending || !readiness.ok} onClick={() => changeStatus("publicado")}>
              Publicar
            </Button>
          )}
          {product.status !== "arquivado" && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => changeStatus("arquivado")}>
              Arquivar
            </Button>
          )}
        </div>
      </div>

      {readiness.tips.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {readiness.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      <Section title="Fotos" defaultOpen>
        <StoreMediaManager productId={product.id} initialMedia={product.media} imageBaseUrl={imageBaseUrl} />
      </Section>

      <Section title="Básico" defaultOpen>
        <Field label="Nome">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço (R$)">
            <Input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label='Preço "de" (R$) — opcional' hint="Aparece riscado. Precisa ser maior que o preço atual.">
            <Input inputMode="decimal" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Descrição curta" hint="Aparece no card do catálogo.">
          <Input maxLength={140} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        </Field>
        <Field label="Descrição">
          <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Destaques" hint="Um por linha, de 3 a 5. Aparecem como bullets na página do produto.">
          <Textarea rows={4} value={highlights} onChange={(e) => setHighlights(e.target.value)} />
        </Field>
      </Section>

      <Section title="Variantes">
        <StoreVariantsManager productId={product.id} initialVariants={product.variants} />
      </Section>

      <Section title="Selos, categoria e prazo">
        <Field label="Selos">
          <div className="flex flex-wrap gap-2">
            {BADGE_OPTIONS.map((b) => {
              const on = badges.includes(b.value);
              return (
                <Button
                  key={b.value}
                  type="button"
                  size="sm"
                  variant={on ? "default" : "outline"}
                  onClick={() => setBadges(on ? badges.filter((x) => x !== b.value) : [...badges, b.value])}
                >
                  {b.label}
                </Button>
              );
            })}
          </div>
        </Field>
        <Field label="Categoria" hint="Texto livre; vira filtro no catálogo (ex.: Miniaturas, Utilitários).">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Entrega">
            <select
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              value={fulfillment}
              onChange={(e) => setFulfillment(e.target.value as StoreFulfillment)}
            >
              <option value="sob_encomenda">Sob encomenda</option>
              <option value="pronta_entrega">Pronta entrega</option>
            </select>
          </Field>
          <Field label="Prazo mínimo (dias)">
            <Input inputMode="numeric" value={leadMin} onChange={(e) => setLeadMin(e.target.value)} />
          </Field>
          <Field label="Prazo máximo (dias)">
            <Input inputMode="numeric" value={leadMax} onChange={(e) => setLeadMax(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="SEO e endereço">
        <Field label="Endereço (slug)" hint="Gerado do nome. Mudar quebra links já compartilhados.">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
        <Field label="Título para o Google" hint="Vazio = usa o nome do produto.">
          <Input maxLength={70} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </Field>
        <Field label="Descrição para o Google" hint="Vazio = usa a descrição curta.">
          <Textarea rows={2} maxLength={160} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
        </Field>
      </Section>

      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background py-3">
        <Button variant="ghost" className="text-destructive" disabled={pending} onClick={remove}>
          Excluir produto
        </Button>
        <Button disabled={pending || !title.trim()} onClick={save}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
