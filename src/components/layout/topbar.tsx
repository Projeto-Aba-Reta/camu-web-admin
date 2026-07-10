"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { CurrentUser } from "@/types/auth";

interface TopbarProps {
  user: Pick<CurrentUser, "email" | "fullName">;
}

function getInitials(user: Pick<CurrentUser, "email" | "fullName">): string {
  if (user.fullName) {
    return user.fullName
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

function useBreadcrumbs(): Array<{ label: string; href?: string }> {
  const pathname = usePathname();
  if (pathname === "/") return [{ label: "Home" }];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: "Home", href: "/" },
  ];

  let accumulated = "";
  segments.forEach((seg, i) => {
    accumulated += `/${seg}`;
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    if (i < segments.length - 1) {
      crumbs.push({ label, href: accumulated });
    } else {
      crumbs.push({ label });
    }
  });

  return crumbs;
}

export function Topbar({ user }: TopbarProps) {
  const crumbs = useBreadcrumbs();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      {/* Breadcrumb — left-padded on mobile to make room for the menu trigger */}
      <div className="pl-10 md:pl-0">
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <Fragment key={i}>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {i < crumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* User menu — right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[140px] truncate text-foreground/80 md:inline">
              {user.fullName ?? user.email}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium">{user.fullName ?? user.email}</p>
            {user.fullName && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
          <DropdownMenuSeparator />
          <form action="/auth/sign-out" method="post">
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 size-4" />
                Sair
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
