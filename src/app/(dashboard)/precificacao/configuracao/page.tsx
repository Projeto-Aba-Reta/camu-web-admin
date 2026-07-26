import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWritePrecificacaoParams, canWritePrinters } from "@/lib/auth/pricing-access";
import { PageHeader } from "@/components/layout/page-header";
import { PrecificacaoNav } from "@/components/precificacao/precificacao-nav";
import { ConfigSection } from "@/components/precificacao/config-section";
import { ParametrosForm, ParametrosHistoryTable } from "@/components/precificacao/parametros-form";
import { ImpressoraForm, ImpressoraHistoryTable } from "@/components/precificacao/impressora-form";
import { CanalFeeForm, CanalFeeHistoryTable } from "@/components/precificacao/canal-fee-form";
import { SizeTierForm, SizeTierHistoryTable } from "@/components/precificacao/size-tier-form";
import { B2bTierForm, B2bTierHistoryTable } from "@/components/precificacao/b2b-tier-form";
import { PricingDraftProvider } from "@/components/precificacao/pricing-draft-context";
import { SimuladorPrecificacao } from "@/components/precificacao/simulador-precificacao";

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
    sizeTierDefinitions,
    currentB2bTiers,
    b2bTiersHistory,
    products,
    slicingSheets,
  ] = await Promise.all([
    repositories.costParameters.findCurrent(),
    repositories.costParameters.findHistory(),
    repositories.printers.findAll(),
    repositories.channelFees.findAllCurrent(),
    repositories.channelFees.findAllHistory(),
    repositories.sizeTierRanges.findAllCurrent(),
    repositories.sizeTierRanges.findAllHistory(),
    repositories.sizeTiers.findAll(),
    repositories.b2bPricingTiers.findAllCurrent(),
    repositories.b2bPricingTiers.findAllHistory(),
    repositories.products.findAll(),
    repositories.slicingSheets.findAll(),
  ]);

  const canWritePrecificacao = canWritePrecificacaoParams(currentUser);
  const canWritePrinter = canWritePrinters(currentUser);

  const activePrinters = allPrinterVersions.filter((printer) => printer.isActive);
  const productNames = new Map(products.map((product) => [product.id, product.name]));

  // Peças de exemplo do simulador: peso e tempo vêm da ficha de fatiamento
  // cadastrada, igual ao motor faz num cálculo real.
  const produtosComFicha = slicingSheets
    .filter((sheet) => productNames.has(sheet.productId))
    .map((sheet) => ({
      id: sheet.id,
      name: productNames.get(sheet.productId)!,
      weightGrams: sheet.materials.reduce((sum, material) => sum + material.pieceGrams, 0),
      printHours: sheet.printHours,
      printerId: sheet.printerId,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuração de precificação"
        description="Parâmetros de custo, parque de impressoras, taxas por canal e faixas de porte. Cada atualização cria um novo registro versionado — o valor anterior fica preservado no histórico."
      />

      <PrecificacaoNav />

      <PricingDraftProvider>
        <div className="space-y-6">
        <ConfigSection
          title="Parâmetros de custo"
          description="Filamento, energia, consumo médio, reserva de falha e embalagem."
          form={<ParametrosForm current={currentCostParameters} canWrite={canWritePrecificacao} />}
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
          form={<CanalFeeForm current={currentChannelFees} canWrite={canWritePrecificacao} />}
          history={<CanalFeeHistoryTable history={channelFeesHistory} />}
        />

        <ConfigSection
          title="Faixas de porte (P/M/G)"
          description="Faixas de referência de peso e tempo de impressão usadas na classificação automática de porte, e a margem de lucro própria de cada porte."
          form={<SizeTierForm current={currentSizeTiers} tiers={sizeTierDefinitions} canWrite={canWritePrecificacao} />}
          history={<SizeTierHistoryTable history={sizeTiersHistory} tiers={sizeTierDefinitions} />}
        />

        <ConfigSection
          title="Faixas de precificação B2B"
          description="Preço por volume (quantidade mínima + margem-alvo), sem taxa de canal — usado por canais de atacado (ex.: academias)."
          form={<B2bTierForm current={currentB2bTiers} canWrite={canWritePrecificacao} />}
          history={<B2bTierHistoryTable history={b2bTiersHistory} />}
        />

        {/* Simulador por último: ele lê o que os formulários acima têm
            preenchido. Fica disponível mesmo sem permissão de escrita. */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Simulador de precificação</h2>
            <p className="text-sm text-muted-foreground">
              Veja a fórmula do motor de cálculo com as taxas atuais e simule uma peça com os valores que você está
              editando acima — antes de salvar.
            </p>
          </div>
          <SimuladorPrecificacao
            costParameters={currentCostParameters}
            printers={activePrinters}
            channelFees={currentChannelFees}
            sizeTierRanges={currentSizeTiers}
            sizeTiers={sizeTierDefinitions}
            b2bTiers={currentB2bTiers}
            produtosComFicha={produtosComFicha}
          />
        </section>
        </div>
      </PricingDraftProvider>
    </div>
  );
}
