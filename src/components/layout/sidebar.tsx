"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNavItem } from "./sidebar-nav-item";
import { AreaScopeToggle } from "./area-scope-toggle";
import type { SidebarSection } from "@/lib/navigation/build-sidebar";
import type { UserType } from "@/types/auth";

interface SidebarProps {
  sections: SidebarSection[];
  userType: UserType;
  isAllScope: boolean;
}

function SidebarContent({ sections, userType, isAllScope }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Wordmark */}
      <div className="flex h-14 items-center px-4">
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          Camu
        </span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, index) => (
          <div key={section.id}>
            {index > 0 && <Separator className="my-2 bg-sidebar-border" />}
            {section.title && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.slug}>
                  <SidebarNavItem item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Scope toggle (socio only) */}
      {userType === "socio" && (
        <>
          <Separator className="bg-sidebar-border" />
          <div className="px-2 py-3">
            <AreaScopeToggle isAllScope={isAllScope} />
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({ sections, userType, isAllScope }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-svh">
          <SidebarContent
            sections={sections}
            userType={userType}
            isAllScope={isAllScope}
          />
        </div>
      </aside>

      {/* Mobile sidebar trigger (rendered in topbar area) */}
      <div className="fixed left-4 top-3.5 z-50 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-foreground">
              <Menu className="size-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <SidebarContent
              sections={sections}
              userType={userType}
              isAllScope={isAllScope}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
