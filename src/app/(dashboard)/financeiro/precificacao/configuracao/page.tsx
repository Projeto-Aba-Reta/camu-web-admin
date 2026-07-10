import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteFinanceiroParams, canWritePrinters } from "@/lib/auth/pricing-access";
import { PageHeader } from "@/components/layout/page-header";
import { PrecificacaoNav } from "@/components/precificacao/precificacao-nav";
import { ConfigSection } from "@/components/precificacao/config-section";
import { ParametrosForm, ParametrosHistoryTable } from "@/components/precificacao/parametros-form";
import { ImpressoraForm, ImpressoraHistoryTable } from "@/components/precificacao/impressora-form";
import { CanalFeeForm, CanalFeeHistoryTable } from "@/components/precificacao/canal-fee-form";
import { SizeTierForm, SizeTierHistoryTable } from "@/components/precificacao/size-tier-form";

export default async function PrecificacaoConfiguracaoPage() {
  const currentUser = await getCurrentProfile();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();
  const repositories = createRepositories(supabase);

  const [
    currentCostParameters,
    costParametersHistory,
    allPrinterVersions,
    currentChannelFees,
    channelFeesHistory,
    currentSizeTiers,
    sizeTiersHistory,
  ] = await Promise.all([
    repositories.costParameters.findCurrent(),
    repositories.costParameters.findHistory(),
    repositories.printers.findAll(),
    repositories.channelFees.findAllCurrent(),
    repositories.channelFees.findAllHistory(),
    repositories.sizeTierRanges.findAllCurrent(),
    repositories.sizeTierRanges.findAllHistory(),
  ]);

  const canWriteFinanceiro = canWriteFinanceiroParams(currentUser);
  const canWritePrinter = canWritePrinters(currentUser);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração de precificação"
        description="Parâmetros de custo, parque de impressoras, taxas por canal e faixas de porte. Cada atualização cria um novo registro versionado — o valor anterior fica preservado no histórico."
      />

      <PrecificacaoNav />

      <div className="space-y-6">
        <ConfigSection
          title="Parâmetros de custo"
          description="Filamento, energia, consumo médio, reserva de falha e embalagem."
          form={<ParametrosForm current={currentCostParameters} canWrite={canWriteFinanceiro} />}
          history={<ParametrosHistoryTable history={costParametersHistory} />}
        />

        <ConfigSection
          title="Parque de impressoras"
          description="Cadastro de impressoras e depreciação por hora, com ativação/desativação."
          form={<ImpressoraForm allVersions={allPrinterVersions} canWrite={canWritePrinter} />}
          history={<ImpressoraHistoryTable allVersions={allPrinterVersions} />}
        />

        <ConfigSection
          title="Taxas por canal"
          description="Taxa percentual e fixa de cada canal de venda suportado."
          form={<CanalFeeForm current={currentChannelFees} canWrite={canWriteFinanceiro} />}
          history={<CanalFeeHistoryTable history={channelFeesHistory} />}
        />

        <ConfigSection
          title="Faixas de porte (P/M/G)"
          description="Faixas de referência de peso e tempo de impressão usadas na classificação automática de porte."
          form={<SizeTierForm current={currentSizeTiers} canWrite={canWriteFinanceiro} />}
          history={<SizeTierHistoryTable history={sizeTiersHistory} />}
        />
      </div>
    </div>
  );
}
