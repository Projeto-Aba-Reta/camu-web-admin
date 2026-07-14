import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canWriteMarketingCalendar } from "@/lib/auth/marketing-calendar-access";
import { SocialContentPlanService } from "@/lib/services/social-content-plan-service";
import { PageHeader } from "@/components/layout/page-header";
import { MarketingViewTabs, type MarketingView } from "@/components/marketing/marketing-view-tabs";
import { MarketingCalendarMonth } from "@/components/marketing/marketing-calendar-month";
import { MarketingBoard } from "@/components/marketing/marketing-board";
import { CommemorativeDateForm } from "@/components/marketing/commemorative-date-form";
import { PlanItemForm } from "@/components/marketing/plan-item-form";

interface CalendarioPageProps {
  // Mês exibido e visão ativa viajam na URL (`?mes=2026-12&view=board`) em
  // vez de estado no cliente: a navegação entre meses é livre (design.md,
  // Open Questions) e cada mês é uma busca no servidor.
  searchParams: Promise<{ mes?: string; view?: string }>;
}

const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

function parseMonth(value: string | undefined): { year: number; month: number } {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }

  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default async function CalendarioMarketingPage({ searchParams }: CalendarioPageProps) {
  const { mes, view } = await searchParams;
  const { year, month } = parseMonth(mes);
  const activeView: MarketingView = view === "board" ? "board" : "calendario";

  const currentUser = await getCurrentProfile();
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const service = new SocialContentPlanService(repositories);

  const [monthPlan, boardItems, activeDates, profiles] = await Promise.all([
    service.listByMonth(year, month),
    service.listByStatus(),
    service.listDates(true),
    repositories.users.listAll(),
  ]);

  const canWrite = Boolean(currentUser && canWriteMarketingCalendar(currentUser));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de marketing"
        description="Datas comemorativas relevantes para as redes sociais e o funil de produção de cada post — da ideia até a publicação."
        action={
          canWrite && (
            <div className="flex gap-2">
              <CommemorativeDateForm />
              <PlanItemForm commemorativeDates={activeDates} profiles={profiles} />
            </div>
          )
        }
      />

      <MarketingViewTabs activeView={activeView} year={year} month={month} />

      {activeView === "calendario" ? (
        <MarketingCalendarMonth
          year={year}
          month={month}
          dates={monthPlan.dates}
          items={monthPlan.items}
          commemorativeDates={activeDates}
          profiles={profiles}
          canWrite={canWrite}
        />
      ) : (
        <MarketingBoard
          items={boardItems}
          commemorativeDates={activeDates}
          profiles={profiles}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
