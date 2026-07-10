"use server";

import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export type SidebarScope = "own" | "all";

export async function setSidebarScope(scope: SidebarScope): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.userType !== "socio") return;

  const cookieStore = await cookies();
  // Session cookie (no maxAge) — cleared automatically when the browser session ends
  // and also explicitly deleted on login so the scope resets per session.
  cookieStore.set("camu_sidebar_scope", scope, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}
