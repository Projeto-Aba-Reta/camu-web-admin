import type { Repositories } from "@/lib/repositories";
import type {
  MonthlySalesResult,
  SalesResult,
  SalesResultByOrigin,
  SalesResultTotals,
} from "@/types/vendas";

// Últimos 12 meses encerrados + o mês corrente.
const DEFAULT_MONTH_SPAN = 13;

// Pedido sem origem gravada veio da loja do site (ver design, decisão 1).
const DEFAULT_ORIGIN_LABEL = "Loja própria";

type SalesResultRepositories = Pick<Repositories, "salesResults" | "saleOrigins">;

const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

// 'YYYY-MM' -> índice absoluto de mês, para somar e comparar sem cair nas
// armadilhas de fuso do objeto Date.
function toMonthIndex(month: string): number {
  const [year, monthPart] = month.split("-");
  return Number(year) * 12 + (Number(monthPart) - 1);
}

function fromMonthIndex(index: number): string {
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
}

function isValidMonth(value: string | undefined): value is string {
  if (!value) return false;
  const match = MONTH_PARAM.exec(value);
  if (!match) return false;
  const monthPart = Number(match[2]);
  return monthPart >= 1 && monthPart <= 12;
}

// Intervalo pedido pela URL, com o padrão e o tratamento de intervalo
// invertido — mês inicial depois do final volta ao padrão em vez de devolver
// série vazia, que a tela leria como "não houve vendas".
export function resolveMonthRange(
  from: string | undefined,
  to: string | undefined,
): { fromMonth: string; toMonth: string } {
  const fallbackTo = currentMonth();
  const fallbackFrom = fromMonthIndex(toMonthIndex(fallbackTo) - (DEFAULT_MONTH_SPAN - 1));

  if (!isValidMonth(from) || !isValidMonth(to)) {
    return { fromMonth: fallbackFrom, toMonth: fallbackTo };
  }
  if (toMonthIndex(from) > toMonthIndex(to)) {
    return { fromMonth: fallbackFrom, toMonth: fallbackTo };
  }
  return { fromMonth: from, toMonth: to };
}

// 'YYYY-MM' -> 'YYYY-MM-01', que é como a view expõe o mês.
function toMonthDate(month: string): string {
  return `${month}-01`;
}

function toMonthKey(monthDate: string): string {
  return monthDate.slice(0, 7);
}

export class SalesResultService {
  constructor(private readonly repositories: SalesResultRepositories) {}

  async getResult(from: string | undefined, to: string | undefined): Promise<SalesResult> {
    const { fromMonth, toMonth } = resolveMonthRange(from, to);

    const [rows, origins] = await Promise.all([
      this.repositories.salesResults.listByMonthRange(toMonthDate(fromMonth), toMonthDate(toMonth)),
      // Todas, inclusive arquivadas: uma origem arquivada com pedidos no
      // período continua aparecendo na quebra.
      this.repositories.saleOrigins.listAll(),
    ]);

    const originById = new Map(origins.map((origin) => [origin.id, origin]));

    // Série contínua: a view não devolve mês sem pedido, e um buraco no eixo
    // seria lido como queda em vez de ausência.
    const seriesByMonth = new Map<string, MonthlySalesResult>();
    for (
      let index = toMonthIndex(fromMonth);
      index <= toMonthIndex(toMonth);
      index += 1
    ) {
      const month = fromMonthIndex(index);
      seriesByMonth.set(month, {
        month,
        revenueCents: 0,
        costCents: 0,
        profitCents: 0,
        orderCount: 0,
      });
    }

    const byOriginId = new Map<string | null, SalesResultByOrigin>();

    for (const row of rows) {
      const monthKey = toMonthKey(row.month);
      const point = seriesByMonth.get(monthKey);
      if (point) {
        point.revenueCents += row.revenueCents;
        point.costCents += row.costCents;
        point.profitCents += row.profitCents;
        point.orderCount += row.orderCount;
      }

      const origin = row.saleOriginId ? originById.get(row.saleOriginId) : undefined;
      const key = row.saleOriginId;
      const bucket = byOriginId.get(key) ?? {
        saleOriginId: key,
        originName: origin?.name ?? DEFAULT_ORIGIN_LABEL,
        originIsActive: origin?.isActive ?? true,
        revenueCents: 0,
        costCents: 0,
        profitCents: 0,
        orderCount: 0,
      };
      bucket.revenueCents += row.revenueCents;
      bucket.costCents += row.costCents;
      bucket.profitCents += row.profitCents;
      bucket.orderCount += row.orderCount;
      byOriginId.set(key, bucket);
    }

    const series = Array.from(seriesByMonth.values());
    const totals = computeTotals(series);
    const byOrigin = Array.from(byOriginId.values()).sort(
      (a, b) => b.revenueCents - a.revenueCents,
    );

    return { fromMonth, toMonth, series, byOrigin, totals };
  }
}

function computeTotals(series: MonthlySalesResult[]): SalesResultTotals {
  const revenueCents = series.reduce((sum, point) => sum + point.revenueCents, 0);
  const costCents = series.reduce((sum, point) => sum + point.costCents, 0);
  const orderCount = series.reduce((sum, point) => sum + point.orderCount, 0);
  const profitCents = revenueCents - costCents;

  return {
    revenueCents,
    costCents,
    profitCents,
    orderCount,
    // Receita zero não é margem 0% — é margem indisponível. Dividir aqui
    // daria Infinity ou NaN e a tela exibiria um número inventado.
    marginPercent: revenueCents === 0 ? null : (profitCents / revenueCents) * 100,
  };
}
