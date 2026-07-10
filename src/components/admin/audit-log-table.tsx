"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogEntry } from "@/lib/repositories/interfaces/audit-log-repository.interface";

const ACTION_LABEL: Record<string, string> = {
  "role.create": "Role criada",
  "role.update": "Role atualizada",
  "role.delete": "Role excluída",
  "sub_role.create": "Sub-role criada",
  "sub_role.update": "Sub-role atualizada",
  "sub_role.delete": "Sub-role excluída",
  "user.invite": "Usuário convidado",
  "user.change_type": "Tipo de usuário alterado",
  "user.assign_role": "Role atribuída a usuário",
  "user.unassign_role": "Role removida de usuário",
  "user.assign_sub_role": "Sub-role atribuída a usuário",
  "user.unassign_sub_role": "Sub-role removida de usuário",
  "system_setting.update": "Configuração alterada",
  "invite.resend": "Convite reenviado",
  "invite.cancel": "Convite cancelado",
  "session.revoke": "Sessões revogadas",
};

export interface AuditLogRow extends AuditLogEntry {
  actorLabel: string;
}

interface AuditLogTableProps {
  entries: AuditLogRow[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Quando",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString("pt-BR")}
          </span>
        ),
      },
      {
        accessorKey: "actorLabel",
        header: "Autor",
        cell: ({ row }) => row.original.actorLabel,
      },
      {
        accessorKey: "action",
        header: "Ação",
        cell: ({ row }) => (
          <Badge variant="secondary">{ACTION_LABEL[row.original.action] ?? row.original.action}</Badge>
        ),
      },
      {
        id: "entity",
        header: "Entidade",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.entityType}
            {row.original.entityId ? ` · ${row.original.entityId}` : ""}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase();
      return (
        row.original.actorLabel.toLowerCase().includes(query) ||
        row.original.action.toLowerCase().includes(query) ||
        row.original.entityType.toLowerCase().includes(query)
      );
    },
  });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por autor, ação ou entidade..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Nenhum registro de auditoria ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
