"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStorefrontEdit } from "@/lib/auth/store-access";
import { StoreService } from "@/lib/vitrine/store-service";
import type { StoreMedia, StoreProductInput, StoreProductStatus, StoreVariant } from "@/lib/vitrine/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const BUCKET = "product-media";

async function service(): Promise<StoreService> {
  const supabase = await createClient();
  return new StoreService(supabase as never);
}

function msg(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function refresh(productId?: string) {
  revalidatePath("/vitrine");
  if (productId) revalidatePath(`/vitrine/${productId}`);
}

export async function createStoreProductAction(
  title: string,
  priceCents: number,
): Promise<ActionResult & { productId?: string }> {
  try {
    const user = await requireStorefrontEdit();
    if (!title.trim()) return { ok: false, error: "Informe o nome do produto." };
    if (!Number.isInteger(priceCents) || priceCents < 0) return { ok: false, error: "Preço inválido." };
    const product = await (await service()).createDraft({ title, priceCents, createdBy: user.id });
    refresh();
    return { ok: true, productId: product.id };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível criar o produto.") };
  }
}

export async function updateStoreProductAction(id: string, input: StoreProductInput): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    if (!input.title.trim()) return { ok: false, error: "Informe o nome do produto." };
    if (!Number.isInteger(input.priceCents) || input.priceCents < 0) return { ok: false, error: "Preço inválido." };
    await (await service()).update(id, input);
    refresh(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível salvar o produto.") };
  }
}

export async function setStoreProductStatusAction(id: string, status: StoreProductStatus): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    await (await service()).setStatus(id, status);
    refresh(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível alterar o status.") };
  }
}

export async function setStoreProductFeaturedAction(id: string, featured: boolean): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    await (await service()).setFeatured(id, featured);
    refresh(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível alterar o destaque.") };
  }
}

export async function duplicateStoreProductAction(id: string): Promise<ActionResult & { productId?: string }> {
  try {
    const user = await requireStorefrontEdit();
    const copy = await (await service()).duplicate(id, user.id);
    refresh();
    return { ok: true, productId: copy.id };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível duplicar.") };
  }
}

export async function deleteStoreProductAction(id: string): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    const supabase = await createClient();
    const paths = await new StoreService(supabase as never).remove(id);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível excluir o produto.") };
  }
}

// ---- mídia: upload direto ao Storage por URL assinada ----------------------

export async function createStoreMediaUploadUrlAction(
  productId: string,
  fileName: string,
): Promise<ActionResult & { storagePath?: string; token?: string }> {
  try {
    await requireStorefrontEdit();
    const supabase = await createClient();
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `store/${productId}/${randomUUID()}-${safe}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);
    if (error) throw error;
    return { ok: true, storagePath: data.path, token: data.token };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível gerar a URL de upload.") };
  }
}

export async function confirmStoreMediaAction(
  productId: string,
  storagePath: string,
  position: number,
): Promise<ActionResult & { media?: StoreMedia }> {
  try {
    await requireStorefrontEdit();
    const media = await (await service()).addMedia(productId, storagePath, position);
    refresh(productId);
    return { ok: true, media };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível registrar a foto.") };
  }
}

export async function reorderStoreMediaAction(productId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    await (await service()).reorderMedia(orderedIds);
    refresh(productId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível reordenar.") };
  }
}

export async function removeStoreMediaAction(
  productId: string,
  mediaId: string,
  storagePath: string,
): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    const supabase = await createClient();
    await new StoreService(supabase as never).removeMedia(mediaId);
    await supabase.storage.from(BUCKET).remove([storagePath]);
    refresh(productId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível remover a foto.") };
  }
}

// ---- variantes -------------------------------------------------------------

export async function addStoreVariantAction(
  productId: string,
  label: string,
  priceDeltaCents: number,
  position: number,
): Promise<ActionResult & { variant?: StoreVariant }> {
  try {
    await requireStorefrontEdit();
    if (!label.trim()) return { ok: false, error: "Informe o nome da variante." };
    const variant = await (await service()).addVariant(productId, label, priceDeltaCents, position);
    refresh(productId);
    return { ok: true, variant };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível criar a variante.") };
  }
}

export async function updateStoreVariantAction(
  productId: string,
  variantId: string,
  patch: { label?: string; priceDeltaCents?: number; active?: boolean },
): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    await (await service()).updateVariant(variantId, patch);
    refresh(productId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível salvar a variante.") };
  }
}

export async function removeStoreVariantAction(productId: string, variantId: string): Promise<ActionResult> {
  try {
    await requireStorefrontEdit();
    await (await service()).removeVariant(variantId);
    refresh(productId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e, "Não foi possível remover a variante.") };
  }
}
