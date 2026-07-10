import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { GovernanceService } from "@/lib/services/governance-service";
import { DecisionLogForm } from "@/components/societario/decision-log-form";
import { formatDate } from "@/lib/utils";

export default async function LogDeDecisoesPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const governanceService = new GovernanceService(repositories);

  const entries = await governanceService.listDecisionLog();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Log de decisões</h2>
          <p className="text-sm text-muted-foreground">
            Decisões relevantes do negócio, mais recente primeiro. Append-only — sem edição.
          </p>
        </div>
        <DecisionLogForm />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
      ) : (
        <ol className="space-y-6 border-l border-border pl-6">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-primary" />
              <p className="text-xs text-muted-foreground">{formatDate(entry.decidedAt)}</p>
              <h3 className="mt-0.5 text-base font-semibold text-foreground">{entry.title}</h3>

              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Contexto</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{entry.context}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Decisão</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{entry.decision}</dd>
                </div>
                {entry.alternativesConsidered && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Alternativas consideradas
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-foreground">
                      {entry.alternativesConsidered}
                    </dd>
                  </div>
                )}
                {entry.reasoning && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Motivo</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{entry.reasoning}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
