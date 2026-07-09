import { cache } from "react";
import { createRepositories } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/server";
import { UserService } from "@/lib/services/user-service";
import type { CurrentUser } from "@/types/auth";

// cache() dedupe a busca dentro da mesma requisição, já que o layout do
// dashboard e páginas individuais podem chamar isso mais de uma vez.
export const getCurrentProfile = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const repositories = createRepositories(supabase);
  const userService = new UserService(repositories);
  return userService.getCurrentUser(user.id);
});
