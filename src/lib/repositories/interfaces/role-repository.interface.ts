import type { Role } from "@/types/auth";

export interface CreateRoleInput {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  createdBy: string;
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  grantedBy: string;
}

export interface IRoleRepository {
  findAll(): Promise<Role[]>;
  findManyForUser(userId: string): Promise<Role[]>;
  create(input: CreateRoleInput): Promise<Role>;
  assignToUser(input: AssignRoleInput): Promise<void>;
}
