export type UserType = "owner" | "socio" | "member";

export type ProfileStatus = "active" | "invited" | "disabled";

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export interface SubRole {
  id: string;
  roleId: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  userType: UserType;
  status: ProfileStatus;
  roles: Role[];
  subRoles: SubRole[];
}
