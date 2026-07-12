"use client";

import { useEffect, useState } from "react";

interface PrintQueueCountdownProps {
  expectedFinishAt: string | null;
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  return `${hours}h${minutes.toString().padStart(2, "0")}min`;
}

// Cronômetro só de exibição: calcula localmente a partir de
// expected_finish_at (definido no servidor ao iniciar a impressão) e
// atualiza a cada segundo via setInterval — a decisão real de "concluído"
// nunca é tomada aqui, sempre no servidor (rotina agendada ou ação manual)
// — ver design.md decisão "Cronômetro é só exibição no cliente".
export function PrintQueueCountdown({ expectedFinishAt }: PrintQueueCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!expectedFinishAt) {
    return <span className="text-muted-foreground">—</span>;
  }

  const remainingMs = new Date(expectedFinishAt).getTime() - now;

  if (remainingMs <= 0) {
    return <span className="text-amber-600">tempo estimado esgotado</span>;
  }

  return <span>faltam {formatRemaining(remainingMs)}</span>;
}
