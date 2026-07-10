import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { PageHeader } from "@/components/layout/page-header";
import { PrecificacaoNav } from "@/components/precificacao/precificacao-nav";
import { HistoricoTabela, type HistoricoRow } from "@/components/precificacao/historico-tabela";

export default async function PrecificacaoHistoricoPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const [calculations, printers] = await Promise.all([
    repositories.priceCalculations.findRecent(200),
    repositories.printers.findAll(),
  ]);

  const printerNameById = new Map(printers.map((printer) => [printer.id, printer.name]));

  const rows: HistoricoRow[] = calculations.map((calculation) => ({
    ...calculation,
    printerName: printerNameById.get(calculation.printerId) ?? "—",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de cálculos"
        description="Cálculos já executados, exibindo exatamente o resultado registrado no momento — sem recalcular com os parâmetros vigentes atuais."
      />

      <PrecificacaoNav />

      <HistoricoTabela rows={rows} />
    </div>
  );
}
