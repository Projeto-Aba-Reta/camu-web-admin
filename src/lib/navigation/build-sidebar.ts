import type { CurrentUser, Role } from "@/types/auth";
import { areaRoutes } from "./area-routes";

export type SidebarItem = {
  slug: string;
  label: string;
  href?: string;
  icon?: string | null;
};

export type SidebarSection = {
  id: string;
  title?: string;
  items: SidebarItem[];
};

const HOME_ITEM: SidebarItem = {
  slug: "home",
  label: "Home",
  href: "/",
  icon: "home",
};

const ADMIN_ITEM: SidebarItem = {
  slug: "administracao",
  label: "Administração",
  href: undefined,
  icon: "settings",
};

function roleToItem(role: Role): SidebarItem {
  const route = areaRoutes[role.slug];
  return {
    slug: role.slug,
    label: role.name,
    href: route?.href,
    icon: role.icon,
  };
}

// Pure function: given the current user profile, sidebar scope, and all
// system roles, returns the sections to render in the sidebar.
// allRoles is required so Owner and Sócio(scope=all) can see every area
// without the layout needing to special-case the query inside this function.
export function buildSidebar(
  profile: CurrentUser,
  scope: "own" | "all",
  allRoles: Role[]
): SidebarSection[] {
  const sections: SidebarSection[] = [];

  sections.push({ id: "common", items: [HOME_ITEM] });

  const visibleRoles: Role[] =
    profile.userType === "owner" || scope === "all" ? allRoles : profile.roles;

  if (visibleRoles.length > 0) {
    sections.push({
      id: "areas",
      title: "Áreas",
      items: visibleRoles.map(roleToItem),
    });
  }

  if (profile.userType === "owner") {
    sections.push({
      id: "admin",
      title: "Administração",
      items: [ADMIN_ITEM],
    });
  }

  return sections;
}
