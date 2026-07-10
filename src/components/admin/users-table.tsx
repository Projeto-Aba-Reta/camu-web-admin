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
import type { UserWithRoles } from "@/lib/services/user-service";

const USER_TYPE_LABEL: Record<UserWithRoles["userType"], string> = {
  owner: "Owner",
  socio: "Sócio",
  member: "Member",
};

const STATUS_LABEL: Record<UserWithRoles["status"], string> = {
  active: "Ativo",
  invited: "Convidado",
  disabled: "Desabilitado",
};

interface UsersTableProps {
  users: UserWithRoles[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("");

  const columns = useMemo<ColumnDef<UserWithRoles>[]>(
    () => [
      {
        accessorKey: "email",
        header: "E-mail",
        cell: ({ row }) => (
          <Link href={`/admin/usuarios/${row.original.id}`} className="font-medium hover:underline">
            {row.original.fullName ?? row.original.email}
          </Link>
        ),
      },
      {
        accessorKey: "userType",
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant={row.original.userType === "owner" ? "default" : "secondary"}>
            {USER_TYPE_LABEL[row.original.userType]}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "outline" : "secondary"}>
            {STATUS_LABEL[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) =>
          row.original.roles.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.roles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).toLowerCase();
      return (
        row.original.email.toLowerCase().includes(query) ||
        (row.original.fullName?.toLowerCase().includes(query) ?? false)
      );
    },
  });

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar por nome ou e-mail..."
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
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
