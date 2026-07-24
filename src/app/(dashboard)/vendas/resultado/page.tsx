import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canReadSalesResult } from "@/lib/auth/sales-access";
import { visibleSalesTabs } from "@/lib/auth/sales-tabs";
import { SalesResultService } from "@/lib/services/sales-result-service";
import { PageHeader } from "@/components/layout/page-header";
import { VendasNav } from "@/components/vendas/vendas-nav";
import { MonthRangePicker } from "@/components/vendas/month-range-picker";
import { SalesResultChart } from "@/components/vendas/sales-result-chart";
import { formatCents } from "@/components/vendas/labels";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ResultadoPageProps {
  searchParams: Promise<{ de?: string; ate?: string }>;
}

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function monthLabel(month: string): string {
  const [year, monthPart] = month.split("-");
  return `${MONTH_SHORT[Number(monthPart) - 1]}/${year.slice(2)}`;
}

export default async function ResultadoPage({ searchParams }: ResultadoPageProps) {
  const { de, ate } = await searchParams;

  const currentUser = await getCurrentProfile();

  // Mais restrita que a área (Requirement "Acesso ao resultado de vendas"):
  // produção lança custo mas não vê o resultado do mês.
  if (!currentUser || !canReadSalesResult(currentUser)) {
    redirect("/vendas/pedidos");
  }

  const supabase = await createClient();
  const service = new SalesResultService(createRepositories(supabase));
  const result = await service.getResult(de, ate);

  const hasData = result.totals.orderCount > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resultado de vendas"
        description="Receita, gasto e lucro por mês. Lucro aqui é operacional — venda menos custo real informado, sem imposto, pró-labore ou rateio de custo fixo."
      />

      <VendasNav activeTab="resultado" visibleTabs={visibleSalesTabs(currentUser)} />

      <MonthRangePicker fromMonth={result.fromMonth} toMonth={result.toMonth} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Receita</p>
          <p className="text-lg font-semibold">{formatCents(result.totals.revenueCents)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Gasto</p>
          <p className="text-lg font-semibold">{formatCents(result.totals.costCents)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">
            {result.totals.profitCents < 0 ? "Prejuízo" : "Lucro"}
          </p>
          <p
            className={cn(
              "text-lg font-semibold",
              result.totals.profitCents < 0 && "text-destructive",
            )}
          >
            {formatCents(result.totals.profitCents)}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Margem</p>
          <p className="text-lg font-semibold">
            {/* Receita zero não é margem 0% — é margem indisponível. */}
            {result.totals.marginPercent === null
              ? "—"
              : `${result.totals.marginPercent.toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Pedidos</p>
          <p className="text-lg font-semibold">{result.totals.orderCount}</p>
        </div>
      </section>

      {hasData ? (
        <>
          <section className="rounded-md border p-4">
            <SalesResultChart series={result.series} />
          </section>

          {/* Tabela do mesmo dado do gráfico: dá os números exatos e cobre
              quem não consegue ler a série pela cor. */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Mês a mês</h2>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.series.map((point) => (
                    <TableRow key={point.month}>
                      <TableCell>{monthLabel(point.month)}</TableCell>
                      <TableCell className="text-right">
                        {formatCents(point.revenueCents)}
                      </TableCell>
                      <TableCell className="text-right">{formatCents(point.costCents)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          point.profitCents < 0 && "text-destructive",
                        )}
                      >
                        {formatCents(point.profitCents)}
                      </TableCell>
                      <TableCell className="text-right">{point.orderCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Por origem da venda</h2>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.byOrigin.map((row) => (
                    <TableRow key={row.saleOriginId ?? "sem-origem"}>
                      <TableCell>
                        {row.originName}
                        {!row.originIsActive && (
                          <Badge variant="outline" className="ml-2">
                            arquivada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCents(row.revenueCents)}</TableCell>
                      <TableCell className="text-right">{formatCents(row.costCents)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          row.profitCents < 0 && "text-destructive",
                        )}
                      >
                        {formatCents(row.profitCents)}
                      </TableCell>
                      <TableCell className="text-right">{row.orderCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      ) : (
        <p className="rounded-md border py-10 text-center text-sm text-muted-foreground">
          Nenhum pedido no período selecionado.
        </p>
      )}
    </div>
  );
}
