import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { PageHeader } from "@/components/layout/page-header";
import { PrecificacaoNav } from "@/components/precificacao/precificacao-nav";
import { CalculoForm } from "@/components/precificacao/calculo-form";

export default async function PrecificacaoCalcularPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const printers = await repositories.printers.findActive();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cálculo de preço por peça"
        description="Informe peso, tempo de impressão do fatiador e a impressora usada para ver o custo, o porte sugerido e o preço por canal."
      />

      <PrecificacaoNav />

      <CalculoForm printers={printers} />
    </div>
  );
}
