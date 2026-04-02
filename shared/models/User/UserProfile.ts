/* eslint-disable @typescript-eslint/no-namespace */
import type {
  UserProfileId,
  UserProfileRead,
  UserProfileWithRole,
  MembershipId as WorkspaceMembershipId,
} from "$/models/User/UserProfile.types.ts";

export namespace UserProfile {
  export type T = UserProfileRead;
  export type Id = UserProfileId;
  export type MembershipId = WorkspaceMembershipId;
  export type WithRole = UserProfileWithRole;
}
