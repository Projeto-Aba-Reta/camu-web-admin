"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";

// A tela da peça tem vários blocos editáveis (dados da peça, preço do site,
// canais) e o usuário não deveria ter que caçar um botão dentro de cada um:
// cada bloco se registra aqui e a barra fixa no rodapé salva todos de uma vez.
// Blocos que já gravam na hora (fotos, partes, componentes, fichas) não se
// registram — não há nada pendente neles.
interface SectionSaver {
  // Nome do bloco, listado na barra enquanto ele tiver alteração pendente.
  label: string;
  isDirty: boolean;
  // Cada bloco reporta o próprio resultado (toast de sucesso ou de erro); a
  // barra só orquestra a ordem.
  save: () => Promise<void>;
}

interface ProductSaveBarContextValue {
  register: (id: string, saver: SectionSaver) => void;
  unregister: (id: string) => void;
  pendingLabels: string[];
  isSaving: boolean;
  saveAll: () => Promise<void>;
}

const ProductSaveBarContext = createContext<ProductSaveBarContextValue | null>(null);

export function ProductSaveBarProvider({ children }: { children: ReactNode }) {
  // A ordem de inserção no Map é a ordem em que os blocos montam, ou seja, a
  // ordem em que aparecem na tela — e também a ordem em que salvamos.
  const saversRef = useRef(new Map<string, SectionSaver>());
  const [pendingLabels, setPendingLabels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const syncPending = useCallback(() => {
    const labels = [...saversRef.current.values()].filter((saver) => saver.isDirty).map((saver) => saver.label);
    setPendingLabels((current) =>
      current.length === labels.length && current.every((label, index) => label === labels[index])
        ? current
        : labels,
    );
  }, []);

  const register = useCallback(
    (id: string, saver: SectionSaver) => {
      saversRef.current.set(id, saver);
      syncPending();
    },
    [syncPending],
  );

  const unregister = useCallback(
    (id: string) => {
      saversRef.current.delete(id);
      syncPending();
    },
    [syncPending],
  );

  const saveAll = useCallback(async () => {
    const pending = [...saversRef.current.values()].filter((saver) => saver.isDirty);
    if (pending.length === 0) return;

    setIsSaving(true);
    try {
      // Sequencial de propósito: os blocos mexem na mesma peça e o servidor
      // recalcula a prontidão para o site a cada gravação — em paralelo, a
      // publicação poderia ser avaliada com o status antigo.
      for (const saver of pending) {
        await saver.save();
      }
    } finally {
      setIsSaving(false);
      syncPending();
    }
  }, [syncPending]);

  const value = useMemo(
    () => ({ register, unregister, pendingLabels, isSaving, saveAll }),
    [register, unregister, pendingLabels, isSaving, saveAll],
  );

  return <ProductSaveBarContext.Provider value={value}>{children}</ProductSaveBarContext.Provider>;
}

// Registra o bloco na barra. `save` é lido por referência, então pode fechar
// sobre o estado mais recente a cada render sem re-registrar o bloco.
export function useProductSaveSection(id: string, label: string, isDirty: boolean, save: () => Promise<void>): void {
  const context = useContext(ProductSaveBarContext);
  const register = context?.register;
  const unregister = context?.unregister;
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    register?.(id, { label, isDirty, save: () => saveRef.current() });
  }, [register, id, label, isDirty]);

  useEffect(() => () => unregister?.(id), [unregister, id]);
}

interface ProductSaveBarProps {
  // "Salvar alterações" na edição, "Cadastrar peça" no cadastro.
  label: string;
  // Mostrado quando não há nada pendente.
  hint?: string;
}

export function ProductSaveBar({ label, hint }: ProductSaveBarProps) {
  const context = useContext(ProductSaveBarContext);
  if (!context) return null;

  const { pendingLabels, isSaving, saveAll } = context;
  const hasPending = pendingLabels.length > 0;

  return (
    // Gruda no rodapé da área de conteúdo (o <main> do dashboard é quem
    // rola), para o botão continuar à mão em qualquer ponto da página. As
    // margens negativas compensam o padding do <main> e fazem a barra
    // encostar nas bordas.
    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur">
      <p className="text-sm text-muted-foreground">
        {hasPending ? (
          <>
            Alterações não salvas em <span className="font-medium text-foreground">{pendingLabels.join(", ")}</span>.
          </>
        ) : (
          (hint ?? "Nenhuma alteração pendente.")
        )}
      </p>
      <Button type="button" onClick={() => void saveAll()} disabled={!hasPending || isSaving}>
        {isSaving ? "Salvando..." : label}
      </Button>
    </div>
  );
}
