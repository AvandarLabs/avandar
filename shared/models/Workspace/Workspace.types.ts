import type { Subscription } from "../Subscription/Subscription.types.ts";
import type { SupabaseCRUDModelSpec } from "@clients/SupabaseCRUDClient/SupabaseCRUDClient.types.ts";
import type { UUID } from "@utils/types/common.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { Tables } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

export type WorkspaceId = UUID<"Workspace">;

export type WorkspaceRole = "admin" | "member";

export type WorkspaceFeature = "add_datasets" | "invite_users";

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

/**
 * CRUD type definitions for the Workspace model.
 */
export type WorkspaceModel = SupabaseCRUDModelSpec<
  {
    tableName: "workspaces";
    modelName: "Workspace";
    modelPrimaryKeyType: WorkspaceId;
    modelTypes: {
      Read: WorkspaceRead;
      Insert: SetOptional<WorkspaceRead, "id" | "createdAt" | "updatedAt">;
      Update: Partial<WorkspaceRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type WorkspaceWithSubscription = WorkspaceRead & {
  subscription: Subscription | undefined;
};

export type WorkspaceInvite = Tables<"workspace_invites">;
