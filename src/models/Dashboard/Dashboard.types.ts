import { SwapDeep } from "$/lib/types/utilityTypes";
import { Json } from "$/types/database.types";
import type { UserId, UserProfileId } from "../User/User.types";
import type { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import type { Model } from "@/models/Model";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";
import type { UUID } from "$/lib/types/common";
import type { SetOptional } from "type-fest";

type ModelType = "Dashboard";

export type DashboardId = UUID<ModelType>;

export type DashboardRead = Model<
  ModelType,
  {
    /** The dashboard's full config as a JSON blob. */
    config: SwapDeep<Json, null, undefined>;

    /** Timestamp of when the Dashboard was created. */
    createdAt: string;

    /** The dashboard's description. */
    description: string | undefined;

    /** The dashboard's unique identifier. */
    id: DashboardId;

    /** Whether the dashboard is public. */
    isPublic: boolean;

    /** The dashboard's name. */
    name: string;

    /** The dashboard's owner id. */
    ownerId: UserId;

    /** The dashboard's owner profile id. */
    ownerProfileId: UserProfileId;

    /** The dashboard's slug. */
    slug: string | undefined;

    /** Timestamp of when the Dashboard was last updated. */
    updatedAt: string;

    /** Workspace id the Dashboard belongs to. */
    workspaceId: WorkspaceId;
  }
>;

/**
 * CRUD type definitions for the Dashboard model.
 */
export type DashboardModel = SupabaseModelCRUDTypes<
  {
    tableName: "dashboards";
    modelName: "Dashboard";
    modelPrimaryKeyType: DashboardId;
    modelTypes: {
      Read: DashboardRead;
      Insert: SetOptional<DashboardRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<DashboardRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type Dashboard<K extends keyof DashboardModel = "Read"> =
  DashboardModel[K];
