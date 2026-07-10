import type { ReactNode } from "react";

interface ConfigSectionProps {
  title: string;
  description?: string;
  form: ReactNode;
  history: ReactNode;
}

export function ConfigSection({ title, description, form, history }: ConfigSectionProps) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>{form}</div>
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Histórico
          </h3>
          {history}
        </div>
      </div>
    </div>
  );
}
