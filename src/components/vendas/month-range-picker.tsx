"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface MonthRangePickerProps {
  // 'YYYY-MM' já resolvidos pelo serviço (inclusive quando a URL vem vazia
  // ou com intervalo invertido).
  fromMonth: string;
  toMonth: string;
}

export function MonthRangePicker({ fromMonth, toMonth }: MonthRangePickerProps) {
  const router = useRouter();

  // Período na URL: a visão do resultado fica compartilhável e recarregável.
  function setRange(from: string, to: string) {
    router.push(`/vendas/resultado?de=${from}&ate=${to}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <div className="space-y-1">
        <Label htmlFor="resultado-de">De</Label>
        <Input
          id="resultado-de"
          type="month"
          className="w-40"
          defaultValue={fromMonth}
          onChange={(event) => setRange(event.target.value, toMonth)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="resultado-ate">Até</Label>
        <Input
          id="resultado-ate"
          type="month"
          className="w-40"
          defaultValue={toMonth}
          onChange={(event) => setRange(fromMonth, event.target.value)}
        />
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/vendas/resultado")}>
        Últimos 12 meses
      </Button>
    </div>
  );
}
