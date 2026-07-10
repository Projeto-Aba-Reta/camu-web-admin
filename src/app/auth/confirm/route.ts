import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveRequestOrigin } from "@/lib/auth/resolve-request-origin";

// Tipo dos links de e-mail (convite/recuperação/etc) que usam token_hash —
// GoTrue não os expõe via query "?code=", diferente do fluxo PKCE tratado
// em /auth/callback. Ver supabase/templates/invite.html.
type ConfirmType = "invite" | "recovery" | "magiclink" | "signup" | "email_change" | "email";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as ConfirmType | null;
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const origin = resolveRequestOrigin(request);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login", origin));
}
