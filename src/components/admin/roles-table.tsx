"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleForm } from "@/components/admin/role-form";
import { DeleteRoleDialog } from "@/components/admin/delete-role-dialog";
import type { RoleWithCounts } from "@/lib/services/role-service";

interface RolesTableProps {
  roles: RoleWithCounts[];
}

export function RolesTable({ roles }: RolesTableProps) {
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<RoleWithCounts>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => (
          <Link href={`/admin/roles/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "slug",
        header: "Slug",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.slug}</span>
        ),
      },
      {
        accessorKey: "subRoleCount",
        header: "Sub-roles",
        cell: ({ row }) => <Badge variant="secondary">{row.original.subRoleCount}</Badge>,
      },
      {
        accessorKey: "userCount",
        header: "Usuários",
        cell: ({ row }) => <Badge variant="secondary">{row.original.userCount}</Badge>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <RoleForm
              mode="edit"
              role={row.original}
              trigger={
                <Button variant="ghost" size="icon-sm">
                  <Pencil className="size-4" />
                  <span className="sr-only">Editar</span>
                </Button>
              }
            />
            <DeleteRoleDialog
              role={row.original}
              trigger={
                <Button variant="ghost" size="icon-sm" className="text-destructive">
                  <Trash2 className="size-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              }
            />
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: roles,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase();
      return (
        row.original.name.toLowerCase().includes(query) ||
        row.original.slug.toLowerCase().includes(query)
      );
    },
  });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nome ou slug..."
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
                  Nenhuma role encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
