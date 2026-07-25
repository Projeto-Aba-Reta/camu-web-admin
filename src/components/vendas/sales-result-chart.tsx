"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents } from "@/components/vendas/labels";
import type { MonthlySalesResult } from "@/types/vendas";

interface SalesResultChartProps {
  // Série já agregada e com os meses vazios preenchidos pelo
  // SalesResultService — nenhuma consulta parte daqui.
  series: MonthlySalesResult[];
}

const SERIES = [
  { key: "receita", label: "Receita", color: "var(--chart-receita)" },
  { key: "gasto", label: "Gasto", color: "var(--chart-gasto)" },
  { key: "lucro", label: "Lucro", color: "var(--chart-lucro)" },
] as const;

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function monthLabel(month: string): string {
  const [year, monthPart] = month.split("-");
  return `${MONTH_SHORT[Number(monthPart) - 1]}/${year.slice(2)}`;
}

// Eixo em reais inteiros: centavos no rótulo do eixo só poluem.
function axisLabel(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

interface TooltipEntry {
  dataKey: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium text-popover-foreground">{monthLabel(label ?? "")}</p>
      {SERIES.map((serie) => {
        const entry = payload.find((item) => item.dataKey === serie.key);
        if (!entry) return null;
        return (
          <p key={serie.key} className="flex items-center gap-2 text-muted-foreground">
            {/* A cor identifica a série; o texto fica em tinta neutra. */}
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: serie.color }}
            />
            {serie.label}: {formatCents(entry.value)}
          </p>
        );
      })}
    </div>
  );
}

export function SalesResultChart({ series }: SalesResultChartProps) {
  const data = series.map((point) => ({
    month: point.month,
    receita: point.revenueCents,
    gasto: point.costCents,
    lucro: point.profitCents,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* Receita e gasto como barras (comparação de magnitude no mês) e
            lucro como linha — os três em reais, no MESMO eixo. Dois eixos y
            fariam o lucro parecer maior ou menor do que é. */}
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={axisLabel}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
            formatter={(value) => SERIES.find((serie) => serie.key === value)?.label ?? value}
          />
          <Bar dataKey="receita" fill="var(--chart-receita)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="gasto" fill="var(--chart-gasto)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Line
            type="monotone"
            dataKey="lucro"
            stroke="var(--chart-lucro)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--chart-lucro)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
