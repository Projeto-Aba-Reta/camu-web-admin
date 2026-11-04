import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/catalog/slug";
import {
  evaluateReadiness,
  type StoreMedia,
  type StoreProduct,
  type StoreProductDetail,
  type StoreProductInput,
  type StoreProductStatus,
  type StoreReadiness,
  type StoreVariant,
} from "./types";

// As tabelas store_* ainda não estão em database.types.ts (gerado a partir do
// banco) — o client é usado sem tipagem de schema. Rode `npm run db:types`
// depois de aplicar a migration para tipar.
type Db = SupabaseClient;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(r: any): StoreProduct {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortDescription: r.short_description,
    description: r.description,
    priceCents: r.price_cents,
    compareAtPriceCents: r.compare_at_price_cents,
    status: r.status,
    category: r.category,
    badges: r.badges ?? [],
    highlights: r.highlights ?? [],
    fulfillment: r.fulfillment,
    leadDaysMin: r.lead_days_min,
    leadDaysMax: r.lead_days_max,
    featuredRank: r.featured_rank,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  };
}

function mapMedia(r: any): StoreMedia {
  return { id: r.id, storagePath: r.storage_path, position: r.position, altText: r.alt_text };
}

function mapVariant(r: any): StoreVariant {
  return {
    id: r.id,
    label: r.label,
    priceDeltaCents: r.price_delta_cents,
    position: r.position,
    active: r.active,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function fail(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function toRow(input: StoreProductInput) {
  // "De" só vale se for maior que o preço atual.
  const compareAt =
    input.compareAtPriceCents != null && input.compareAtPriceCents > input.priceCents
      ? input.compareAtPriceCents
      : null;
  return {
    title: input.title.trim(),
    slug: input.slug,
    short_description: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    price_cents: input.priceCents,
    compare_at_price_cents: compareAt,
    category: input.category?.trim() || null,
    badges: input.badges,
    highlights: input.highlights.map((h) => h.trim()).filter(Boolean).slice(0, 6),
    fulfillment: input.fulfillment,
    lead_days_min: input.leadDaysMin,
    lead_days_max: input.leadDaysMax,
    seo_title: input.seoTitle?.trim() || null,
    seo_description: input.seoDescription?.trim() || null,
  };
}

export class StoreService {
  constructor(private readonly db: Db) {}

  async list(): Promise<(StoreProduct & { coverPath: string | null })[]> {
    const { data, error } = await this.db
      .from("store_products")
      .select("*, store_product_media(storage_path, position)")
      .order("created_at", { ascending: false });
    fail(error, "Falha ao listar produtos da vitrine");
    return (data ?? []).map((r) => {
      const media = ((r.store_product_media ?? []) as { storage_path: string; position: number }[]).sort(
        (a, b) => a.position - b.position,
      );
      return { ...mapProduct(r), coverPath: media[0]?.storage_path ?? null };
    });
  }

  async get(id: string): Promise<StoreProductDetail | null> {
    const { data, error } = await this.db.from("store_products").select("*").eq("id", id).maybeSingle();
    fail(error, "Falha ao carregar produto");
    if (!data) return null;
    const [media, variants] = await Promise.all([
      this.db.from("store_product_media").select("*").eq("product_id", id).order("position"),
      this.db.from("store_variants").select("*").eq("product_id", id).order("position"),
    ]);
    fail(media.error, "Falha ao carregar fotos");
    fail(variants.error, "Falha ao carregar variantes");
    return {
      ...mapProduct(data),
      media: (media.data ?? []).map(mapMedia),
      variants: (variants.data ?? []).map(mapVariant),
    };
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base;
    for (let n = 2; n < 100; n++) {
      let q = this.db.from("store_products").select("id").eq("slug", candidate);
      if (excludeId) q = q.neq("id", excludeId);
      const { data, error } = await q.maybeSingle();
      fail(error, "Falha ao validar slug");
      if (!data) return candidate;
      candidate = `${base}-${n}`;
    }
    throw new Error("Não foi possível gerar um slug único.");
  }

  /** Cria rascunho só com nome e preço; fotos e o resto vêm na edição. */
  async createDraft(input: { title: string; priceCents: number; createdBy: string }): Promise<StoreProduct> {
    const slug = await this.uniqueSlug(slugify(input.title));
    const { data, error } = await this.db
      .from("store_products")
      .insert({ title: input.title.trim(), slug, price_cents: input.priceCents, created_by: input.createdBy })
      .select("*")
      .single();
    fail(error, "Falha ao criar produto");
    return mapProduct(data);
  }

  async update(id: string, input: StoreProductInput): Promise<StoreProduct> {
    const slug = await this.uniqueSlug(input.slug.trim() ? slugify(input.slug) : slugify(input.title), id);
    const { data, error } = await this.db
      .from("store_products")
      .update(toRow({ ...input, slug }))
      .eq("id", id)
      .select("*")
      .single();
    fail(error, "Falha ao salvar produto");
    return mapProduct(data);
  }

  async readiness(id: string): Promise<StoreReadiness> {
    const detail = await this.get(id);
    if (!detail) throw new Error("Produto não encontrado.");
    return evaluateReadiness({ ...detail, mediaCount: detail.media.length });
  }

  async setStatus(id: string, status: StoreProductStatus): Promise<void> {
    if (status === "publicado") {
      const r = await this.readiness(id);
      if (!r.ok) throw new Error(`Para publicar falta: ${r.missing.join(", ")}.`);
    }
    const patch: Record<string, unknown> = { status };
    if (status === "publicado") patch.published_at = new Date().toISOString();
    const { error } = await this.db.from("store_products").update(patch).eq("id", id);
    fail(error, "Falha ao alterar status");
  }

  async setFeatured(id: string, featured: boolean): Promise<void> {
    const { error } = await this.db
      .from("store_products")
      .update({ featured_rank: featured ? 1 : null })
      .eq("id", id);
    fail(error, "Falha ao alterar destaque");
  }

  async duplicate(id: string, createdBy: string): Promise<StoreProduct> {
    const src = await this.get(id);
    if (!src) throw new Error("Produto não encontrado.");
    const slug = await this.uniqueSlug(slugify(`${src.title} copia`));
    const { data, error } = await this.db
      .from("store_products")
      .insert({
        ...toRow({ ...src, slug, title: `${src.title} (cópia)` }),
        status: "rascunho",
        created_by: createdBy,
      })
      .select("*")
      .single();
    fail(error, "Falha ao duplicar produto");
    if (src.variants.length) {
      const { error: vErr } = await this.db.from("store_variants").insert(
        src.variants.map((v) => ({
          product_id: data.id,
          label: v.label,
          price_delta_cents: v.priceDeltaCents,
          position: v.position,
          active: v.active,
        })),
      );
      fail(vErr, "Falha ao copiar variantes");
    }
    return mapProduct(data);
  }

  /** Remove o produto e devolve os paths para limpar o Storage. */
  async remove(id: string): Promise<string[]> {
    const { data: media, error: mErr } = await this.db
      .from("store_product_media")
      .select("storage_path")
      .eq("product_id", id);
    fail(mErr, "Falha ao ler fotos");
    const { error } = await this.db.from("store_products").delete().eq("id", id);
    fail(error, "Falha ao excluir produto");
    return (media ?? []).map((m) => m.storage_path as string);
  }

  // ---- mídia ---------------------------------------------------------------

  async addMedia(productId: string, storagePath: string, position: number): Promise<StoreMedia> {
    const { data, error } = await this.db
      .from("store_product_media")
      .insert({ product_id: productId, storage_path: storagePath, position })
      .select("*")
      .single();
    fail(error, "Falha ao registrar foto");
    return mapMedia(data);
  }

  async reorderMedia(orderedIds: string[]): Promise<void> {
    const results = await Promise.all(
      orderedIds.map((id, index) => this.db.from("store_product_media").update({ position: index }).eq("id", id)),
    );
    results.forEach((r) => fail(r.error, "Falha ao reordenar fotos"));
  }

  async removeMedia(id: string): Promise<void> {
    const { error } = await this.db.from("store_product_media").delete().eq("id", id);
    fail(error, "Falha ao remover foto");
  }

  // ---- variantes -----------------------------------------------------------

  async addVariant(productId: string, label: string, priceDeltaCents: number, position: number): Promise<StoreVariant> {
    const { data, error } = await this.db
      .from("store_variants")
      .insert({ product_id: productId, label: label.trim(), price_delta_cents: priceDeltaCents, position })
      .select("*")
      .single();
    fail(error, "Falha ao criar variante");
    return mapVariant(data);
  }

  async updateVariant(id: string, patch: { label?: string; priceDeltaCents?: number; active?: boolean }): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.label !== undefined) row.label = patch.label.trim();
    if (patch.priceDeltaCents !== undefined) row.price_delta_cents = patch.priceDeltaCents;
    if (patch.active !== undefined) row.active = patch.active;
    const { error } = await this.db.from("store_variants").update(row).eq("id", id);
    fail(error, "Falha ao salvar variante");
  }

  async removeVariant(id: string): Promise<void> {
    const { error } = await this.db.from("store_variants").delete().eq("id", id);
    fail(error, "Falha ao remover variante");
  }
}
