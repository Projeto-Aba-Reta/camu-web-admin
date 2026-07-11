"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  confirmMediaUploadAction,
  createMediaUploadUrlAction,
  reorderMediaAction,
  removeMediaAction,
  setCoverMediaAction,
} from "@/app/(dashboard)/producao/catalogo/actions";
import type { ProductMedia } from "@/types/catalog";

const PRODUCT_MEDIA_BUCKET = "product-media";

interface MediaManagerProps {
  productId: string;
  initialMedia: ProductMedia[];
  canWrite: boolean;
}

export function MediaManager({ productId, initialMedia, canWrite }: MediaManagerProps) {
  const router = useRouter();
  const [media, setMedia] = useState<ProductMedia[]>(initialMedia);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  function publicUrlFor(storagePath: string): string {
    const supabase = createClient();
    return supabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setIsUploading(true);

    for (const file of Array.from(files)) {
      const urlResult = await createMediaUploadUrlAction(productId, file.name);
      if (!urlResult.ok || !urlResult.storagePath || !urlResult.signedUrl || !urlResult.token) {
        toast.error(urlResult.error ?? "Não foi possível gerar a URL de upload.");
        continue;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_MEDIA_BUCKET)
        .uploadToSignedUrl(urlResult.storagePath, urlResult.token, file);

      if (uploadError) {
        toast.error(`Não foi possível enviar ${file.name}.`);
        continue;
      }

      const confirmResult = await confirmMediaUploadAction(productId, urlResult.storagePath, media.length);
      if (!confirmResult.ok || !confirmResult.media) {
        toast.error(confirmResult.error ?? "Não foi possível registrar a foto enviada.");
        continue;
      }

      setMedia((current) => [...current, confirmResult.media!]);
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleDrop(targetIndex: number) {
    const sourceIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const reordered = [...media];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setMedia(reordered);

    const result = await reorderMediaAction(
      productId,
      reordered.map((item) => item.id),
    );
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível reordenar as fotos.");
      setMedia(media);
      return;
    }
    router.refresh();
  }

  async function handleSetCover(mediaId: string) {
    const result = await setCoverMediaAction(productId, mediaId);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível definir a capa.");
      return;
    }
    setMedia((current) => current.map((item) => ({ ...item, isCover: item.id === mediaId })));
    router.refresh();
  }

  async function handleRemove(mediaId: string, storagePath: string) {
    const result = await removeMediaAction(productId, mediaId, storagePath);
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível remover a foto.");
      return;
    }
    setMedia((current) => current.filter((item) => item.id !== mediaId));
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Fotos</h3>
        {canWrite && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="size-4" />
              {isUploading ? "Enviando..." : "Enviar foto"}
            </Button>
          </>
        )}
      </div>

      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {media.map((item, index) => (
            <div
              key={item.id}
              draggable={canWrite}
              onDragStart={() => {
                dragIndexRef.current = index;
              }}
              onDragOver={(event) => canWrite && event.preventDefault()}
              onDrop={() => canWrite && handleDrop(index)}
              className="group relative overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrlFor(item.storagePath)} alt="" className="aspect-square w-full object-cover" />
              {item.isCover && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Capa
                </span>
              )}
              {canWrite && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-white hover:bg-white/20 hover:text-white"
                    title="Definir como capa"
                    onClick={() => handleSetCover(item.id)}
                  >
                    <StarIcon className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-white hover:bg-white/20 hover:text-white"
                    title="Remover"
                    onClick={() => handleRemove(item.id, item.storagePath)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
