import type { Repositories } from "@/lib/repositories";
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from "@/lib/repositories/interfaces/role-repository.interface";
import type {
  CreateSubRoleInput,
  UpdateSubRoleInput,
} from "@/lib/repositories/interfaces/sub-role-repository.interface";
import type { Role, SubRole } from "@/types/auth";
import { DuplicateSlugError } from "@/lib/errors/domain-errors";
import { AuditLogService, AUDIT_ACTIONS } from "./audit-log-service";

export interface RoleWithCounts extends Role {
  subRoleCount: number;
  userCount: number;
}

export class RoleService {
  constructor(
    private readonly repositories: Pick<Repositories, "roles" | "subRoles" | "auditLog">,
  ) {}

  listRoles(): Promise<Role[]> {
    return this.repositories.roles.findAll();
  }

  listRolesForUser(userId: string): Promise<Role[]> {
    return this.repositories.roles.findManyForUser(userId);
  }

  async getRole(id: string): Promise<Role | null> {
    return this.repositories.roles.findById(id);
  }

  async getRoleBySlug(slug: string): Promise<Role | null> {
    return this.repositories.roles.findBySlug(slug);
  }

  async listRolesWithCounts(): Promise<RoleWithCounts[]> {
    const [roles, subRoles, assignments] = await Promise.all([
      this.repositories.roles.findAll(),
      this.repositories.subRoles.findAll(),
      this.repositories.roles.listAllAssignments(),
    ]);

    const subRoleCounts = new Map<string, number>();
    for (const subRole of subRoles) {
      subRoleCounts.set(subRole.roleId, (subRoleCounts.get(subRole.roleId) ?? 0) + 1);
    }

    const userCounts = new Map<string, number>();
    for (const assignment of assignments) {
      userCounts.set(assignment.roleId, (userCounts.get(assignment.roleId) ?? 0) + 1);
    }

    return roles.map((role) => ({
      ...role,
      subRoleCount: subRoleCounts.get(role.id) ?? 0,
      userCount: userCounts.get(role.id) ?? 0,
    }));
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    const existing = await this.repositories.roles.findBySlug(input.slug);
    if (existing) {
      throw new DuplicateSlugError(`Já existe uma role com o slug "${input.slug}".`);
    }
    const role = await this.repositories.roles.create(input);
    await this.auditLog().record(input.createdBy, AUDIT_ACTIONS.ROLE_CREATE, "roles", role.id, {
      name: role.name,
      slug: role.slug,
    });
    return role;
  }

  async updateRole(input: UpdateRoleInput, actorId: string | null): Promise<Role> {
    const existing = await this.repositories.roles.findBySlug(input.slug);
    if (existing && existing.id !== input.id) {
      throw new DuplicateSlugError(`Já existe uma role com o slug "${input.slug}".`);
    }
    const role = await this.repositories.roles.update(input);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.ROLE_UPDATE, "roles", role.id, {
      name: role.name,
      slug: role.slug,
    });
    return role;
  }

  async deleteRole(id: string, actorId: string | null): Promise<void> {
    // sub-roles e associações de usuário são removidas em cascata pelo
    // banco (ver SupabaseRoleRepository.delete).
    await this.repositories.roles.delete(id);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.ROLE_DELETE, "roles", id);
  }

  listSubRoles(roleId: string): Promise<SubRole[]> {
    return this.repositories.subRoles.findManyForRole(roleId);
  }

  async createSubRole(input: CreateSubRoleInput, actorId: string | null): Promise<SubRole> {
    const existing = await this.repositories.subRoles.findBySlugInRole(input.roleId, input.slug);
    if (existing) {
      throw new DuplicateSlugError(`Já existe uma sub-role com o slug "${input.slug}" nesta role.`);
    }
    const subRole = await this.repositories.subRoles.create(input);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.SUB_ROLE_CREATE, "sub_roles", subRole.id, {
      name: subRole.name,
      slug: subRole.slug,
      roleId: input.roleId,
    });
    return subRole;
  }

  async updateSubRole(
    input: UpdateSubRoleInput,
    roleId: string,
    actorId: string | null,
  ): Promise<SubRole> {
    const existing = await this.repositories.subRoles.findBySlugInRole(roleId, input.slug);
    if (existing && existing.id !== input.id) {
      throw new DuplicateSlugError(`Já existe uma sub-role com o slug "${input.slug}" nesta role.`);
    }
    const subRole = await this.repositories.subRoles.update(input);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.SUB_ROLE_UPDATE, "sub_roles", subRole.id, {
      name: subRole.name,
      slug: subRole.slug,
      roleId,
    });
    return subRole;
  }

  async deleteSubRole(id: string, roleId: string, actorId: string | null): Promise<void> {
    await this.repositories.subRoles.delete(id);
    await this.auditLog().record(actorId, AUDIT_ACTIONS.SUB_ROLE_DELETE, "sub_roles", id, {
      roleId,
    });
  }

  private auditLog(): AuditLogService {
    return new AuditLogService(this.repositories);
  }
}
