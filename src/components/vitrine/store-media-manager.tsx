"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  confirmStoreMediaAction,
  createStoreMediaUploadUrlAction,
  removeStoreMediaAction,
  reorderStoreMediaAction,
} from "@/app/(dashboard)/vitrine/actions";
import type { StoreMedia } from "@/lib/vitrine/types";

const BUCKET = "product-media";

export function StoreMediaManager({
  productId,
  initialMedia,
  imageBaseUrl,
}: {
  productId: string;
  initialMedia: StoreMedia[];
  imageBaseUrl: string;
}) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    let position = media.length;
    for (const file of Array.from(files)) {
      const url = await createStoreMediaUploadUrlAction(productId, file.name);
      if (!url.ok || !url.storagePath || !url.token) {
        toast.error(url.error ?? "Não foi possível gerar a URL de upload.");
        continue;
      }
      const { error } = await createClient().storage.from(BUCKET).uploadToSignedUrl(url.storagePath, url.token, file);
      if (error) {
        toast.error(`Não foi possível enviar ${file.name}.`);
        continue;
      }
      const saved = await confirmStoreMediaAction(productId, url.storagePath, position++);
      if (!saved.ok || !saved.media) {
        toast.error(saved.error ?? "Não foi possível registrar a foto.");
        continue;
      }
      setMedia((cur) => [...cur, saved.media!]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function onDrop(target: number) {
    const source = dragIndex.current;
    dragIndex.current = null;
    if (source === null || source === target) return;
    const next = [...media];
    const [moved] = next.splice(source, 1);
    next.splice(target, 0, moved);
    setMedia(next);
    const r = await reorderStoreMediaAction(productId, next.map((m) => m.id));
    if (!r.ok) {
      toast.error(r.error ?? "Não foi possível reordenar.");
      setMedia(media);
    } else router.refresh();
  }

  async function onRemove(m: StoreMedia) {
    const r = await removeStoreMediaAction(productId, m.id, m.storagePath);
    if (!r.ok) { toast.error(r.error ?? "Não foi possível remover."); return; }
    setMedia((cur) => cur.filter((x) => x.id !== m.id));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">A primeira foto é a capa. Arraste para reordenar.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <UploadIcon className="size-4" />
          {uploading ? "Enviando..." : "Enviar fotos"}
        </Button>
      </div>
      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto ainda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {media.map((m, i) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="group relative overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${imageBaseUrl}/${m.storagePath}`} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Capa
                </span>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute bottom-1 right-1 size-7 bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 hover:text-white group-hover:opacity-100"
                title="Remover"
                onClick={() => onRemove(m)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
