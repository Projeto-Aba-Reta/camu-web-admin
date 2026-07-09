import type { Repositories } from "@/lib/repositories";
import type { InviteUserInput, Profile } from "@/lib/repositories/interfaces/user-repository.interface";
import type { CurrentUser } from "@/types/auth";

export interface AssignSubRoleInput {
  userId: string;
  subRoleId: string;
  grantedBy: string;
}

export class UserService {
  constructor(private readonly repositories: Repositories) {}

  async getCurrentUser(userId: string): Promise<CurrentUser | null> {
    const profile = await this.repositories.users.findById(userId);
    if (!profile) return null;

    const [roles, subRoles] = await Promise.all([
      this.repositories.roles.findManyForUser(userId),
      this.repositories.subRoles.findManyForUser(userId),
    ]);

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      userType: profile.userType,
      status: profile.status,
      roles,
      subRoles,
    };
  }

  listUsers(): Promise<Profile[]> {
    return this.repositories.users.listAll();
  }

  inviteUser(input: InviteUserInput): Promise<Profile> {
    return this.repositories.users.invite(input);
  }

  // Atribuir uma sub-role sempre implica a role pai. Isso já é garantido por
  // um trigger no Postgres, mas é replicado aqui como regra de negócio
  // explícita para não depender de um comportamento específico do provedor
  // de dados atual (ver design.md, decisão 5).
  async assignSubRole(input: AssignSubRoleInput): Promise<void> {
    const subRole = await this.repositories.subRoles.findById(input.subRoleId);
    if (!subRole) {
      throw new Error(`Sub-role ${input.subRoleId} não encontrada.`);
    }

    await this.repositories.roles.assignToUser({
      userId: input.userId,
      roleId: subRole.roleId,
      grantedBy: input.grantedBy,
    });

    await this.repositories.subRoles.assignToUser(input);
  }
}
