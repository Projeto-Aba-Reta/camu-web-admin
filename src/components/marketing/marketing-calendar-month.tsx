import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SOCIAL_CHANNEL_LABEL, SOCIAL_STATUS_LABEL } from "@/components/marketing/labels";
import { cn } from "@/lib/utils";
import type { CommemorativeDateOccurrence } from "@/lib/services/social-content-plan-service";
import type { CommemorativeDate, SocialContentPlanItem } from "@/types/marketing";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface MarketingCalendarMonthProps {
  year: number;
  month: number;
  dates: CommemorativeDateOccurrence[];
  items: SocialContentPlanItem[];
  commemorativeDates: CommemorativeDate[];
  profiles: Profile[];
  canWrite: boolean;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function monthParam(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function MarketingCalendarMonth({
  year,
  month,
  dates,
  items,
  commemorativeDates,
  profiles,
  canWrite,
}: MarketingCalendarMonthProps) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Quantas células vazias antes do dia 1, para alinhar com o dia da semana.
  const leadingBlanks = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const datesByDay = new Map<number, CommemorativeDateOccurrence[]>();
  for (const occurrence of dates) {
    const day = Number(occurrence.occursOn.slice(8, 10));
    datesByDay.set(day, [...(datesByDay.get(day) ?? []), occurrence]);
  }

  const itemsByDay = new Map<number, SocialContentPlanItem[]>();
  for (const item of items) {
    if (!item.targetDate) continue;
    const day = Number(item.targetDate.slice(8, 10));
    itemsByDay.set(day, [...(itemsByDay.get(day) ?? []), item]);
  }

  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const navClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

  const dateById = new Map(commemorativeDates.map((date) => [date.id, date]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/marketing/calendario?mes=${monthParam(previous.year, previous.month)}&view=calendario`}
          className={navClass}
        >
          <ChevronLeft className="size-4" />
          {MONTH_NAMES[previous.month - 1]}
        </Link>

        <h2 className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[month - 1]} de {year}
        </h2>

        <Link
          href={`/marketing/calendario?mes=${monthParam(next.year, next.month)}&view=calendario`}
          className={navClass}
        >
          {MONTH_NAMES[next.month - 1]}
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
        {WEEKDAY_NAMES.map((weekday) => (
          <div key={weekday} className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
            {weekday}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} className="min-h-24 bg-background" />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayDates = datesByDay.get(day) ?? [];
          const dayItems = itemsByDay.get(day) ?? [];

          return (
            <div key={day} className="min-h-24 space-y-1 bg-background p-1.5">
              <span className="text-xs font-medium text-muted-foreground">{day}</span>

              {dayDates.map((occurrence) => (
                <Badge key={occurrence.date.id} variant="secondary" className="w-full justify-start truncate">
                  {occurrence.date.name}
                </Badge>
              ))}

              {dayItems.map((item) => {
                const linkedDate = item.commemorativeDateId ? dateById.get(item.commemorativeDateId) : undefined;
                const responsible = item.responsibleId ? profileById.get(item.responsibleId) : undefined;
                const summary = [
                  item.channels.map((channel) => SOCIAL_CHANNEL_LABEL[channel]).join(" + "),
                  SOCIAL_STATUS_LABEL[item.status],
                  responsible?.fullName ?? responsible?.email,
                  linkedDate?.name,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div
                    key={item.id}
                    title={summary}
                    className="truncate rounded border-l-2 border-primary bg-muted/50 px-1.5 py-1 text-xs text-foreground"
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{summary}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {canWrite && (
        <p className="text-xs text-muted-foreground">
          Posts aparecem no dia da data alvo. Itens sem data alvo só aparecem no board por status.
        </p>
      )}
    </div>
  );
}
