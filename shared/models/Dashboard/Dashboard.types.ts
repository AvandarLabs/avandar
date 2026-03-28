import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { SwapDeep } from "@utils/types/utilities.types.ts";
import type { SupabaseCRUDModelSpec } from "$/models/SupabaseCRUDModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UserProfileId } from "$/models/User/UserProfile.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

type ModelType = "Dashboard";

export type DashboardId = UUID<ModelType>;

export type DashboardRead = Model.Base<
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
    workspaceId: Workspace.Id;
  }
>;

/**
 * CRUD type definitions for the Dashboard model.
 */
export type DashboardModel = SupabaseCRUDModelSpec<
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
