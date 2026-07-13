import { Badge } from "@/components/ui/badge";
import { AdvanceStatusButton } from "@/components/marketing/advance-status-button";
import { PlanItemForm } from "@/components/marketing/plan-item-form";
import { SOCIAL_CHANNEL_LABEL, SOCIAL_STATUS_LABEL } from "@/components/marketing/labels";
import { SOCIAL_CONTENT_STATUS_SEQUENCE, type CommemorativeDate, type SocialContentPlanItem } from "@/types/marketing";
import type { Profile } from "@/lib/repositories/interfaces/user-repository.interface";

interface MarketingBoardProps {
  items: SocialContentPlanItem[];
  commemorativeDates: CommemorativeDate[];
  profiles: Profile[];
  canWrite: boolean;
}

function formatTargetDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function MarketingBoard({ items, commemorativeDates, profiles, canWrite }: MarketingBoardProps) {
  const dateById = new Map(commemorativeDates.map((date) => [date.id, date]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {SOCIAL_CONTENT_STATUS_SEQUENCE.map((status) => {
        const columnItems = items.filter((item) => item.status === status);
        const isLastStatus = status === SOCIAL_CONTENT_STATUS_SEQUENCE[SOCIAL_CONTENT_STATUS_SEQUENCE.length - 1];

        return (
          <div key={status} className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-foreground">{SOCIAL_STATUS_LABEL[status]}</h3>
              <span className="text-xs text-muted-foreground">{columnItems.length}</span>
            </div>

            {columnItems.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nenhum item.</p>
            ) : (
              columnItems.map((item) => {
                const linkedDate = item.commemorativeDateId ? dateById.get(item.commemorativeDateId) : undefined;
                const responsible = item.responsibleId ? profileById.get(item.responsibleId) : undefined;
                const targetDate = formatTargetDate(item.targetDate);

                return (
                  <div key={item.id} className="space-y-2 rounded border bg-background p-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>

                    <div className="flex flex-wrap gap-1">
                      {item.channels.map((channel) => (
                        <Badge key={channel} variant="outline">
                          {SOCIAL_CHANNEL_LABEL[channel]}
                        </Badge>
                      ))}
                      {linkedDate && <Badge variant="secondary">{linkedDate.name}</Badge>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {targetDate ? `Data alvo: ${targetDate}` : "Sem data alvo"}
                      {responsible && ` · ${responsible.fullName ?? responsible.email}`}
                    </p>

                    {canWrite && (
                      <div className="flex flex-wrap gap-1">
                        <PlanItemForm
                          commemorativeDates={commemorativeDates}
                          profiles={profiles}
                          item={item}
                        />
                        {/* `publicado` é o fim do funil linear — não há para
                            onde avançar. */}
                        {!isLastStatus && <AdvanceStatusButton itemId={item.id} currentStatus={item.status} />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
