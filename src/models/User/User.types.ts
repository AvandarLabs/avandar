import type { WorkspaceId } from "../Workspace/Workspace.types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { UUID } from "$/lib/types/common";
import type { Merge } from "type-fest";

export type UserId = UUID<"User">;
export type UserProfileId = UUID<"UserProfile">;
export type MembershipId = UUID<"Membership">;

export type User = Merge<
  SupabaseUser,
  {
    id: UserId;
    email: string;
  }
>;

export type UserProfile = {
  /**
   * **NOTE:** This is actually the user **profile** id, not the user id.
   * Meaning, this is the id of the user profile for a specific workspace.
   * For the user id, get the `userId` of this object.
   */
  profileId: UserProfileId;
  membershipId: MembershipId;

  /**
   * This is the user's id in the auth database. This user has this same id
   * across all workspaces. This user id is uniquely associated in a 1-1 way
   * with the `email`.
   */
  userId: UserId;
  workspaceId: WorkspaceId;
  email: string;
  fullName: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};
