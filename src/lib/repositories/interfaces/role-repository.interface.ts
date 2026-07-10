import type { Role } from "@/types/auth";

export interface CreateRoleInput {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  createdBy: string | null;
}

export interface UpdateRoleInput {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  grantedBy: string | null;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
}

export interface IRoleRepository {
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findBySlug(slug: string): Promise<Role | null>;
  findManyForUser(userId: string): Promise<Role[]>;
  listAllAssignments(): Promise<RoleAssignment[]>;
  create(input: CreateRoleInput): Promise<Role>;
  update(input: UpdateRoleInput): Promise<Role>;
  delete(id: string): Promise<void>;
  assignToUser(input: AssignRoleInput): Promise<void>;
  unassignFromUser(userId: string, roleId: string): Promise<void>;
}
