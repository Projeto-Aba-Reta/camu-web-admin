"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createRepositories, type Repositories } from "@/lib/repositories";
import { CatalogService } from "@/lib/services/catalog-service";
import { SlicingSheetService } from "@/lib/services/slicing-sheet-service";
import { requireCatalogWrite, requireChannelListingWrite } from "@/lib/auth/catalog-access";
import type { ProductCategory, ProductMedia, ProductStatus } from "@/types/catalog";
import type { MarketplaceChannel } from "@/types/pricing";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const PRODUCT_MEDIA_BUCKET = "product-media";
const CATALOGO_PATH = "/producao/catalogo";

function productPath(productId: string): string {
  return `${CATALOGO_PATH}/${productId}`;
}

async function getRepositories(): Promise<Repositories> {
  const supabase = await createClient();
  return createRepositories(supabase);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// =============================================================================
// Peça
// =============================================================================

export interface ProductFormInput {
  name: string;
  description: string | null;
  category: ProductCategory;
  status: ProductStatus;
}

export interface SaveProductActionResult extends ActionResult {
  productId?: string;
}

// priceCalculationId: cálculo já salvo (buscado no histórico ou recém
// calculado e salvo via calculatePriceAction de precificacao-telas — ver
// design.md decisão 1) a ser vinculado à peça. null = sem vínculo.
export async function createProductAction(
  input: ProductFormInput,
  priceCalculationId: string | null,
): Promise<SaveProductActionResult> {
  try {
    const user = await requireCatalogWrite();
    const repositories = await getRepositories();
    const catalogService = new CatalogService(repositories);

    const product = await catalogService.createProduct({
      name: input.name,
      description: input.description,
      category: input.category,
      createdBy: user.id,
    });

    if (input.status !== "rascunho") {
      await catalogService.updateProduct(product.id, { status: input.status });
    }
    if (priceCalculationId) {
      await catalogService.linkPriceCalculation(product.id, priceCalculationId);
    }

    revalidatePath(CATALOGO_PATH);
    revalidatePath(productPath(product.id));
    return { ok: true, productId: product.id };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível cadastrar a peça.") };
  }
}

export async function updateProductAction(
  productId: string,
  input: ProductFormInput,
  priceCalculationId: string | null,
): Promise<ActionResult> {
  try {
    await requireCatalogWrite();
    const repositories = await getRepositories();
    const catalogService = new CatalogService(repositories);

    await catalogService.updateProduct(productId, {
      name: input.name,
      description: input.description,
      category: input.category,
      status: input.status,
    });

    if (priceCalculationId) {
      await catalogService.linkPriceCalculation(productId, priceCalculationId);
    }

    revalidatePath(CATALOGO_PATH);
    revalidatePath(productPath(productId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar a peça.") };
  }
}

// =============================================================================
// Mídia
// =============================================================================

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export interface CreateMediaUploadUrlResult extends ActionResult {
  storagePath?: string;
  signedUrl?: string;
  token?: string;
}

// Gera URL assinada de upload direto ao bucket (ver design.md decisão 4) —
// o binário não passa pelo servidor Next.js, só o path/token.
export async function createMediaUploadUrlAction(
  productId: string,
  fileName: string,
): Promise<CreateMediaUploadUrlResult> {
  try {
    await requireCatalogWrite();
    const supabase = await createClient();
    const storagePath = `${productId}/${randomUUID()}-${sanitizeFileName(fileName)}`;

    const { data, error } = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).createSignedUploadUrl(storagePath);
    if (error) throw error;

    return { ok: true, storagePath: data.path, signedUrl: data.signedUrl, token: data.token };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível gerar a URL de upload.") };
  }
}

export interface ConfirmMediaUploadResult extends ActionResult {
  media?: ProductMedia;
}

export async function confirmMediaUploadAction(
  productId: string,
  storagePath: string,
  displayOrder: number,
): Promise<ConfirmMediaUploadResult> {
  try {
    await requireCatalogWrite();
    const repositories = await getRepositories();
    const catalogService = new CatalogService(repositories);
    const media = await catalogService.addMedia({ productId, storagePath, displayOrder });
    revalidatePath(productPath(productId));
    return { ok: true, media };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível registrar a foto enviada.") };
  }
}

// Persistência em lote da nova ordem (ver design.md decisão 5): uma
// chamada ao soltar, não uma por posição durante o arraste.
export async function reorderMediaAction(productId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireCatalogWrite();
    const repositories = await getRepositories();
    await Promise.all(orderedIds.map((id, index) => repositories.productMedia.updateDisplayOrder(id, index)));
    revalidatePath(productPath(productId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível reordenar as fotos.") };
  }
}

export async function setCoverMediaAction(productId: string, mediaId: string): Promise<ActionResult> {
  try {
    await requireCatalogWrite();
    const repositories = await getRepositories();
    const catalogService = new CatalogService(repositories);
    await catalogService.setCoverMedia(mediaId, productId);
    revalidatePath(productPath(productId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível definir a capa.") };
  }
}

export async function removeMediaAction(
  productId: string,
  mediaId: string,
  storagePath: string,
): Promise<ActionResult> {
  try {
    await requireCatalogWrite();
    const supabase = await createClient();
    const { error: storageError } = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).remove([storagePath]);
    if (storageError) throw storageError;

    const repositories = await getRepositories();
    const catalogService = new CatalogService(repositories);
    await catalogService.removeMedia(mediaId);
    revalidatePath(productPath(productId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível remover a foto.") };
  }
}

// =============================================================================
// Disponibilidade por canal
// =============================================================================

export interface ChannelListingActionInput {
  channel: MarketplaceChannel;
  listedPrice: number;
  isActive: boolean;
  priceOverrideReason: string | null;
}

export async function upsertChannelListingAction(
  productId: string,
  input: ChannelListingActionInput,
): Promise<ActionResult> {
  try {
    await requireChannelListingWrite();
    const repositories = await getRepositories();
    const catalogService = new CatalogService(repositories);

    const existingListings = await repositories.productChannelListings.findByProductId(productId);
    const current = existingListings.find((listing) => listing.channel === input.channel);

    if (current) {
      await catalogService.updateChannelListingPrice(
        productId,
        current.id,
        input.channel,
        input.listedPrice,
        input.priceOverrideReason,
      );
      if (input.isActive !== current.isActive) {
        await repositories.productChannelListings.update(current.id, { isActive: input.isActive });
      }
    } else {
      const created = await catalogService.createChannelListing({
        productId,
        channel: input.channel,
        listedPrice: input.listedPrice,
        priceOverrideReason: input.priceOverrideReason,
      });
      if (!input.isActive) {
        await repositories.productChannelListings.update(created.id, { isActive: false });
      }
    }

    revalidatePath(productPath(productId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar a disponibilidade do canal.") };
  }
}

// =============================================================================
// Ficha de fatiamento
// =============================================================================

export interface SlicingSheetMaterialActionInput {
  materialId: string;
  pieceGrams: number;
  supportGrams: number;
}

export interface SlicingSheetActionInput {
  printerId: string;
  printHours: number;
  materials: SlicingSheetMaterialActionInput[];
}

export async function upsertSlicingSheetAction(
  productId: string,
  input: SlicingSheetActionInput,
): Promise<ActionResult> {
  try {
    const user = await requireCatalogWrite();
    const repositories = await getRepositories();
    const slicingSheetService = new SlicingSheetService(repositories);

    await slicingSheetService.upsertSheet({
      productId,
      printerId: input.printerId,
      printHours: input.printHours,
      materials: input.materials,
      createdBy: user.id,
    });

    revalidatePath(productPath(productId));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar a ficha de fatiamento.") };
  }
}
