import { createClient } from "@/lib/supabase/server";
import { createRepositories } from "@/lib/repositories";
import { AuditLogService } from "@/lib/services/audit-log-service";
import { UserService } from "@/lib/services/user-service";
import { PageHeader } from "@/components/layout/page-header";
import { AuditLogTable, type AuditLogRow } from "@/components/admin/audit-log-table";

export default async function AdminAuditLogPage() {
  const supabase = await createClient();
  const repositories = createRepositories(supabase);
  const auditLogService = new AuditLogService(repositories);
  const userService = new UserService(repositories);

  const [entries, users] = await Promise.all([
    auditLogService.listRecent(200),
    userService.listUsers(),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));

  const rows: AuditLogRow[] = entries.map((entry) => {
    const actor = entry.actorId ? userById.get(entry.actorId) : null;
    return {
      ...entry,
      actorLabel: actor ? (actor.fullName ?? actor.email) : "Sistema",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Histórico de ações administrativas sensíveis, mais recentes primeiro."
      />

      <AuditLogTable entries={rows} />
    </div>
  );
}
