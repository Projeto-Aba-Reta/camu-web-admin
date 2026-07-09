import type { SubRole } from "@/types/auth";

export interface CreateSubRoleInput {
  roleId: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface AssignSubRoleInput {
  userId: string;
  subRoleId: string;
  grantedBy: string;
}

export interface ISubRoleRepository {
  findById(id: string): Promise<SubRole | null>;
  findManyForRole(roleId: string): Promise<SubRole[]>;
  findManyForUser(userId: string): Promise<SubRole[]>;
  create(input: CreateSubRoleInput): Promise<SubRole>;
  assignToUser(input: AssignSubRoleInput): Promise<void>;
}
