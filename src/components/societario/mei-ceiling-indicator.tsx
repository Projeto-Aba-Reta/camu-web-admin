import { cn, formatCurrency } from "@/lib/utils";
import type { MeiCeilingStatus } from "@/types/governance";

const ATTENTION_THRESHOLD = 0.8;

interface MeiCeilingIndicatorProps {
  status: MeiCeilingStatus;
}

export function MeiCeilingIndicator({ status }: MeiCeilingIndicatorProps) {
  if (status.annualCeiling === null || status.percentageReached === null) {
    return (
      <div className="rounded-md border p-4">
        <p className="text-sm text-muted-foreground">
          Teto do MEI ainda não configurado para {status.year}.
        </p>
      </div>
    );
  }

  const percentage = status.percentageReached;
  const isAttention = percentage >= ATTENTION_THRESHOLD;
  const barWidth = Math.min(percentage, 1) * 100;

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border p-4",
        isAttention && "border-destructive/50 bg-destructive/5",
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-foreground">Teto do MEI atingido em {status.year}</p>
        <p className={cn("text-lg font-semibold", isAttention ? "text-destructive" : "text-foreground")}>
          {(percentage * 100).toFixed(1)}%
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", isAttention ? "bg-destructive" : "bg-primary")}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {formatCurrency(status.revenueLast12Months)} acumulados nos últimos 12 meses, de um teto anual
        de {formatCurrency(status.annualCeiling)}.
      </p>

      {isAttention && (
        <p className="text-xs font-medium text-destructive">
          Atenção: faturamento acima de {(ATTENTION_THRESHOLD * 100).toFixed(0)}% do teto do MEI.
        </p>
      )}
    </div>
  );
}
