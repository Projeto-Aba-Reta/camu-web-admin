import type { ProfileStatus, UserType } from "@/types/auth";

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  userType: UserType;
  status: ProfileStatus;
}

export interface InviteUserInput {
  email: string;
  fullName?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<Profile | null>;
  listAll(): Promise<Profile[]>;
  invite(input: InviteUserInput): Promise<Profile>;
}
