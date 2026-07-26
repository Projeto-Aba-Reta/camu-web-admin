// Popula roles e usuários de exemplo a partir da divisão sócio→área hoje
// documentada em camu-docs/01-visao-geral/sociedade-e-divisao.md.
// Uso recomendado apenas em ambiente local (`npm run seed-roles`, com o
// Supabase local rodando via `npm run supabase:start`). Ver README.md.
//
// Idempotente: roles são upsertadas por slug, usuários por e-mail — rodar
// de novo não duplica nada.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createRepositories } from "../src/lib/repositories";
import { RoleService } from "../src/lib/services/role-service";
import { UserService } from "../src/lib/services/user-service";
import type { Database } from "../src/lib/supabase/database.types";
import type { Role } from "../src/types/auth";

// Client isolado com a service_role key, construído aqui (em vez de
// reaproveitar src/lib/supabase/admin.ts) porque esse módulo importa
// "server-only", que lança erro fora do bundler do Next — incompatível com
// a execução direta deste script via tsx.
function createSeedAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const SEED_PASSWORD = "socio123456";

const ROLE_DEFS = [
  { name: "Produção", slug: "producao" },
  { name: "Marketing", slug: "marketing" },
  // Deixou de ser reserva de nome: a área tem tela (/vendas/pedidos), rota
  // em areaRoutes e policies próprias desde a migration
  // vendas_funil_e_resultado — a sidebar a renderiza como item clicável.
  // Etapas do funil e origens de venda vêm do `npm run seed-vendas`.
  { name: "Vendas/Marketplace", slug: "vendas" },
  { name: "Site", slug: "site" },
  { name: "Assinatura", slug: "assinatura" },
  { name: "Infra/Automação", slug: "infra-automacao" },
  { name: "Precificação", slug: "precificacao" },
  { name: "Societário", slug: "societario" },
] as const;

const SOCIO_DEFS = [
  {
    email: "socio-a@camu.local",
    fullName: "Sócio A",
    roleSlugs: ["producao", "marketing"],
  },
  {
    email: "socio-b@camu.local",
    fullName: "Sócio B",
    roleSlugs: ["site", "assinatura", "infra-automacao"],
  },
  {
    // Reflete o gap hoje documentado no camu-docs: Sócio C ainda sem
    // nenhuma área própria atribuída.
    email: "socio-c@camu.local",
    fullName: "Sócio C",
    roleSlugs: [] as string[],
  },
] as const;

async function upsertRoles(
  roleService: RoleService,
  ownerId: string | null,
): Promise<Map<string, Role>> {
  const roleBySlug = new Map<string, Role>();

  for (const def of ROLE_DEFS) {
    const existing = await roleService.getRoleBySlug(def.slug);

    if (existing) {
      const updated = await roleService.updateRole(
        {
          id: existing.id,
          name: def.name,
          slug: def.slug,
          description: existing.description,
          icon: existing.icon,
        },
        ownerId,
      );
      roleBySlug.set(def.slug, updated);
      console.log(`  - role "${def.name}" já existia — mantida.`);
    } else {
      const created = await roleService.createRole({
        name: def.name,
        slug: def.slug,
        createdBy: ownerId,
      });
      roleBySlug.set(def.slug, created);
      console.log(`  - role "${def.name}" criada.`);
    }
  }

  return roleBySlug;
}

async function upsertSocios(
  userService: UserService,
  adminClient: SupabaseClient<Database>,
  roleBySlug: Map<string, Role>,
  ownerId: string | null,
): Promise<void> {
  for (const def of SOCIO_DEFS) {
    let profile = await userService.getUserByEmail(def.email);

    if (!profile) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: def.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: def.fullName },
      });
      if (error) throw error;

      // Bootstrap: define o user_type inicial diretamente via update na
      // tabela (não pela RPC change_user_type, que exige uma sessão de
      // Owner autenticada e não se aplica a um script rodando com
      // service_role sem usuário logado).
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({ user_type: "socio" })
        .eq("id", data.user.id);
      if (updateError) throw updateError;

      profile = await userService.getUser(data.user.id);
      console.log(`  - usuário ${def.email} criado (user_type=socio).`);
    } else {
      console.log(`  - usuário ${def.email} já existia — mantido.`);
    }

    if (!profile) {
      throw new Error(`Falha ao localizar o perfil de ${def.email} após criação.`);
    }

    for (const slug of def.roleSlugs) {
      const role = roleBySlug.get(slug);
      if (!role) continue;
      await userService.assignRole(profile.id, role.id, ownerId);
    }
  }
}

async function main() {
  console.log("Iniciando seed de roles e usuários de exemplo...\n");

  const adminClient = createSeedAdminClient();
  const repositories = createRepositories(adminClient);
  const roleService = new RoleService(repositories);
  const userService = new UserService(repositories);

  const existingUsers = await userService.listUsers();
  const owner = existingUsers.find((user) => user.userType === "owner") ?? null;

  console.log("Upsertando roles...");
  const roleBySlug = await upsertRoles(roleService, owner?.id ?? null);

  console.log("\nUpsertando usuários de exemplo...");
  await upsertSocios(userService, adminClient, roleBySlug, owner?.id ?? null);

  console.log("\nSeed concluído.");
  console.log(
    "AVISO: a divisão sócio→área aplicada acima é PROVISÓRIA (reflete o snapshot de " +
      "camu-docs/01-visao-geral/sociedade-e-divisao.md usado neste seed) e deve ser " +
      "revisada/ajustada pelo Owner nas telas /admin/roles e /admin/usuarios.",
  );
}

// Sem process.exit() forçado: o cliente Supabase (undici) drena o pool e o
// Node encerra sozinho. Chamar process.exit() aqui dispara, de forma
// intermitente no Windows, o assertion do libuv
// (!(handle->flags & UV_HANDLE_CLOSING), src\win\async.c) por causa dos
// handles async do loader do tsx, o que abortava o `make dev`.
main().catch((error) => {
  console.error("\nErro ao rodar o seed:", error);
  process.exitCode = 1;
});
