import type { Repositories } from "@/lib/repositories";
import type { InviteUserInput, Profile } from "@/lib/repositories/interfaces/user-repository.interface";
import type { CurrentUser, Role, UserType } from "@/types/auth";
import { UserAlreadyExistsError } from "@/lib/errors/domain-errors";
import { AuditLogService, AUDIT_ACTIONS } from "./audit-log-service";

export interface AssignSubRoleInput {
  userId: string;
  subRoleId: string;
  grantedBy: string;
}

export interface UserWithRoles extends Profile {
  roles: Role[];
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

  getUser(userId: string): Promise<Profile | null> {
    return this.repositories.users.findById(userId);
  }

  getUserByEmail(email: string): Promise<Profile | null> {
    return this.repositories.users.findByEmail(email);
  }

  async listUsersWithRoles(): Promise<UserWithRoles[]> {
    const [users, roles, assignments] = await Promise.all([
      this.repositories.users.listAll(),
      this.repositories.roles.findAll(),
      this.repositories.roles.listAllAssignments(),
    ]);

    const roleById = new Map(roles.map((role) => [role.id, role]));
    const rolesByUser = new Map<string, Role[]>();
    for (const assignment of assignments) {
      const role = roleById.get(assignment.roleId);
      if (!role) continue;
      const list = rolesByUser.get(assignment.userId) ?? [];
      list.push(role);
      rolesByUser.set(assignment.userId, list);
    }

    return users.map((user) => ({ ...user, roles: rolesByUser.get(user.id) ?? [] }));
  }

  async inviteUser(input: InviteUserInput, actorId: string | null): Promise<Profile> {
    const existing = await this.repositories.users.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsError(`Já existe um usuário cadastrado com o e-mail "${input.email}".`);
    }
    const profile = await this.repositories.users.invite(input);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.USER_INVITE, "profiles", profile.id, {
      email: input.email,
    });
    return profile;
  }

  async assignRole(userId: string, roleId: string, grantedBy: string | null): Promise<void> {
    await this.repositories.roles.assignToUser({ userId, roleId, grantedBy });
    await this.auditLog().record(grantedBy, AUDIT_ACTIONS.USER_ASSIGN_ROLE, "profiles", userId, {
      roleId,
    });
  }

  // Remover uma role também remove as sub-roles que o usuário tenha dentro
  // dela — do contrário o usuário ficaria com uma sub-role "órfã" (sem a
  // role pai), o inverso da implicação aplicada em assignSubRole.
  async unassignRole(userId: string, roleId: string, actorId: string | null): Promise<void> {
    const subRolesOfRole = await this.repositories.subRoles.findManyForRole(roleId);
    const userSubRoles = await this.repositories.subRoles.findManyForUser(userId);
    const userSubRoleIds = new Set(userSubRoles.map((subRole) => subRole.id));

    for (const subRole of subRolesOfRole) {
      if (userSubRoleIds.has(subRole.id)) {
        await this.repositories.subRoles.unassignFromUser(userId, subRole.id);
      }
    }

    await this.repositories.roles.unassignFromUser(userId, roleId);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.USER_UNASSIGN_ROLE, "profiles", userId, {
      roleId,
    });
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
    await this.auditLog().record(
      input.grantedBy,
      AUDIT_ACTIONS.USER_ASSIGN_SUB_ROLE,
      "profiles",
      input.userId,
      { subRoleId: input.subRoleId },
    );
  }

  async unassignSubRole(userId: string, subRoleId: string, actorId: string | null): Promise<void> {
    await this.repositories.subRoles.unassignFromUser(userId, subRoleId);
    await this.auditLog().record(
      actorId,
      AUDIT_ACTIONS.USER_UNASSIGN_SUB_ROLE,
      "profiles",
      userId,
      { subRoleId },
    );
  }

  async changeUserType(userId: string, newType: UserType, actorId: string | null): Promise<Profile> {
    const previous = await this.repositories.users.findById(userId);
    const profile = await this.repositories.users.changeUserType(userId, newType);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.USER_CHANGE_TYPE, "profiles", userId, {
      from: previous?.userType ?? null,
      to: newType,
    });
    return profile;
  }

  private auditLog(): AuditLogService {
    return new AuditLogService(this.repositories);
  }
}
