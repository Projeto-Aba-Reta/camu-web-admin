import type { SubRole } from "@/types/auth";

export interface CreateSubRoleInput {
  roleId: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface UpdateSubRoleInput {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface AssignSubRoleInput {
  userId: string;
  subRoleId: string;
  grantedBy: string;
}

export interface SubRoleAssignment {
  userId: string;
  subRoleId: string;
}

export interface ISubRoleRepository {
  findById(id: string): Promise<SubRole | null>;
  findAll(): Promise<SubRole[]>;
  findBySlugInRole(roleId: string, slug: string): Promise<SubRole | null>;
  findManyForRole(roleId: string): Promise<SubRole[]>;
  findManyForUser(userId: string): Promise<SubRole[]>;
  listAllAssignments(): Promise<SubRoleAssignment[]>;
  create(input: CreateSubRoleInput): Promise<SubRole>;
  update(input: UpdateSubRoleInput): Promise<SubRole>;
  delete(id: string): Promise<void>;
  assignToUser(input: AssignSubRoleInput): Promise<void>;
  unassignFromUser(userId: string, subRoleId: string): Promise<void>;
}
