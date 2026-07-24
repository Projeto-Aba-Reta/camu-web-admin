"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArrowDown, ArrowUp, Flag, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineStageForm } from "@/components/vendas/pipeline-stage-form";
import { stageColorClass } from "@/components/vendas/labels";
import {
  archiveStageAction,
  reorderStagesAction,
  restoreStageAction,
  setFinalStageAction,
  setInitialStageAction,
} from "@/app/(dashboard)/vendas/actions";
import type { OrderPipelineStage } from "@/types/vendas";
import { cn } from "@/lib/utils";

interface PipelineStageListProps {
  stages: OrderPipelineStage[];
  // Quantos pedidos cada etapa tem — é o número que bloqueia o arquivamento,
  // e mostrá-lo antes evita a tentativa que vai falhar.
  orderCountByStageId: Record<string, number>;
}

export function PipelineStageList({ stages, orderCountByStageId }: PipelineStageListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const activeStages = stages.filter((stage) => stage.isActive);
  const archivedStages = stages.filter((stage) => !stage.isActive);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível concluir a ação.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  // Reordenação envia a lista inteira na ordem desejada; o serviço normaliza
  // as posições em 1..n.
  function move(index: number, direction: -1 | 1) {
    const next = [...activeStages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => reorderStagesAction(next.map((stage) => stage.id)), "Ordem das etapas atualizada.");
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-md border">
        {activeStages.map((stage, index) => {
          const orderCount = orderCountByStageId[stage.id] ?? 0;

          return (
            <li key={stage.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-sm font-medium",
                  stageColorClass(stage.color),
                )}
              >
                {stage.name}
              </span>

              {stage.isInitial && <Badge variant="secondary">inicial</Badge>}
              {stage.isFinal && <Badge variant="secondary">final</Badge>}
              {stage.requiresPrinter && <Badge variant="outline">exige impressora</Badge>}
              <span className="text-xs text-muted-foreground">
                {orderCount} pedido{orderCount === 1 ? "" : "s"}
              </span>

              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending || index === activeStages.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>

                <PipelineStageForm stage={stage} />

                {!stage.isInitial && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Marcar como etapa inicial"
                    disabled={isPending}
                    onClick={() =>
                      run(() => setInitialStageAction(stage.id), `"${stage.name}" é a etapa inicial.`)
                    }
                  >
                    <Play className="size-4" />
                  </Button>
                )}

                {!stage.isFinal && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Marcar como etapa final"
                    disabled={isPending}
                    onClick={() =>
                      run(() => setFinalStageAction(stage.id), `"${stage.name}" é a etapa final.`)
                    }
                  >
                    <Flag className="size-4" />
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title={
                    orderCount > 0
                      ? `Mova os ${orderCount} pedido(s) desta etapa antes de arquivá-la`
                      : "Arquivar etapa"
                  }
                  // O servidor recusa de qualquer forma; desabilitar aqui só
                  // poupa o clique que já se sabe que vai falhar.
                  disabled={isPending || orderCount > 0 || stage.isInitial}
                  onClick={() =>
                    run(() => archiveStageAction(stage.id), `"${stage.name}" arquivada.`)
                  }
                >
                  <Archive className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {archivedStages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Etapas arquivadas</h3>
          <ul className="divide-y rounded-md border">
            {archivedStages.map((stage) => (
              <li key={stage.id} className="flex items-center gap-2 px-3 py-2">
                <span className="text-sm text-muted-foreground">{stage.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  disabled={isPending}
                  onClick={() =>
                    run(() => restoreStageAction(stage.id), `"${stage.name}" reativada.`)
                  }
                >
                  <RotateCcw className="size-4" />
                  Reativar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
