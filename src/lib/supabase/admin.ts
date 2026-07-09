import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Client isolado com a service_role key — bypassa RLS. Só deve ser usado
// para operações administrativas (ex.: convite de usuário via Auth Admin
// API) e nunca deve ser importado por código que roda no browser.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
