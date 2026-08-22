import type { SubscriptionRead } from "$/models/Subscription/Subscription.types.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UUID } from "@avandar/utils";

export type WorkspaceId = UUID<"Workspace">;

export type WorkspaceRole = "admin" | "member";

/** Defines a Workspace. */
export type WorkspaceRead = {
  /** Unique identifier for this workspace */
  id: WorkspaceId;

  /** User ID of the owner. References auth.users(id). */
  ownerId: UserId;

  /** Display name of the workspace */
  name: string;

  /** Unique slug for the workspace URL */
  slug: string;

  /** Timestamp when this workspace was created */
  createdAt: string;

  /** Timestamp when this workspace was last updated */
  updatedAt: string;
};

export type WorkspaceWithSubscription = WorkspaceRead & {
  subscription: SubscriptionRead | undefined;
};
