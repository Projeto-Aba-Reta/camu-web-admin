import type { Repositories } from "@/lib/repositories";
import type {
  AssignRoleInput,
  CreateRoleInput,
} from "@/lib/repositories/interfaces/role-repository.interface";
import type { Role } from "@/types/auth";

export class RoleService {
  constructor(private readonly repositories: Pick<Repositories, "roles">) {}

  listRoles(): Promise<Role[]> {
    return this.repositories.roles.findAll();
  }

  listRolesForUser(userId: string): Promise<Role[]> {
    return this.repositories.roles.findManyForUser(userId);
  }

  createRole(input: CreateRoleInput): Promise<Role> {
    return this.repositories.roles.create(input);
  }

  assignRole(input: AssignRoleInput): Promise<void> {
    return this.repositories.roles.assignToUser(input);
  }
}
