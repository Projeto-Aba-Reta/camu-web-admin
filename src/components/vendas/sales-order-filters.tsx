"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderPipelineStage, SaleOrigin } from "@/types/vendas";

// "Todos" precisa de um value não-vazio (o Radix Select recusa string vazia);
// ao aplicar, ele vira ausência do parâmetro na URL.
const ALL = "__all__";

interface SalesOrderFiltersProps {
  origins: SaleOrigin[];
  stages: OrderPipelineStage[];
  sellerNames: string[];
}

export function SalesOrderFilters({ origins, stages, sellerNames }: SalesOrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filtro na URL, não em estado de cliente: a visão fica compartilhável e
  // sobrevive ao refresh (mesmo padrão do calendário de marketing).
  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/vendas/pedidos?${params.toString()}`);
  }

  const hasFilters = ["de", "ate", "origem", "vendedor", "etapa"].some((key) =>
    searchParams.has(key),
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <div className="space-y-1">
        <Label htmlFor="filtro-de">De</Label>
        <Input
          id="filtro-de"
          type="date"
          className="w-40"
          defaultValue={searchParams.get("de") ?? ""}
          onChange={(event) => setParam("de", event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filtro-ate">Até</Label>
        <Input
          id="filtro-ate"
          type="date"
          className="w-40"
          defaultValue={searchParams.get("ate") ?? ""}
          onChange={(event) => setParam("ate", event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>Origem</Label>
        <Select
          value={searchParams.get("origem") ?? ALL}
          onValueChange={(value) => setParam("origem", value)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {origins.map((origin) => (
              <SelectItem key={origin.id} value={origin.id}>
                {origin.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filtro-vendedor">Vendedor</Label>
        {/* Texto, não lista de usuários: o vendedor pode ser alguém sem conta
            no ERP. Casa por trecho do nome, então "Ana" acha "Ana Paula".
            Aplica ao sair do campo ou no Enter — a cada tecla trocaria de rota
            no meio da digitação. A `key` remonta o campo quando o filtro muda
            por fora (ex.: "Limpar filtros"). */}
        <Input
          id="filtro-vendedor"
          key={searchParams.get("vendedor") ?? ""}
          list="vendedores-filtro"
          className="w-44"
          placeholder="Todos"
          defaultValue={searchParams.get("vendedor") ?? ""}
          onBlur={(event) => setParam("vendedor", event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") setParam("vendedor", event.currentTarget.value.trim());
          }}
        />
        <datalist id="vendedores-filtro">
          {sellerNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1">
        <Label>Etapa</Label>
        <Select
          value={searchParams.get("etapa") ?? ALL}
          onValueChange={(value) => setParam("etapa", value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/vendas/pedidos")}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
