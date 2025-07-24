import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { UserId } from "../User/types";
import type { UUID } from "@/lib/types/common";

export type WorkspaceId = UUID<"Workspace">;

export type WorkspaceRole = "admin" | "member";

/**
 * Defines a Workspace.
 */
type WorkspaceRead = {
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

type WorkspaceInsert = SetOptional<
  WorkspaceRead,
  "id" | "createdAt" | "updatedAt"
>;

type WorkspaceUpdate = Partial<WorkspaceInsert>;

/**
 * CRUD type definitions for the Workspace model.
 */
export type WorkspaceModel = SupabaseModelCRUDTypes<
  {
    tableName: "workspaces";
    modelName: "Workspace";
    modelPrimaryKeyType: WorkspaceId;
    modelTypes: {
      Read: WorkspaceRead;
      Insert: WorkspaceInsert;
      Update: WorkspaceUpdate;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type Workspace<K extends keyof WorkspaceModel = "Read"> =
  WorkspaceModel[K];

export type WorkspaceUser = {
  id: UserId;
  fullName: string;
  displayName: string;
  workspaceId: WorkspaceId;
  createdAt: Date;
  updatedAt: Date;
  role: string;
};

export type AddableUser = {
  id: UserId;
  fullName: string;
  displayName: string;
  email?: string;
};
