import type { Model } from "@avandar/models";
import type { SwapDeep, UUID } from "@avandar/utils";
import type {
  DASHBOARD_SNAPSHOT_TRANSITION_KINDS,
  DASHBOARD_VISIBILITIES,
} from "$/models/Dashboard/Dashboard.constants.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { UserProfileId } from "$/models/User/UserProfile.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

type ModelType = "Dashboard";

export type DashboardId = UUID<ModelType>;

/**
 * Publication state of a dashboard. Mirrors the `dashboard_visibility` enum in
 * `supabase/schemas/00.enum.dashboard_visibility.sql`.
 */
export type DashboardVisibility = (typeof DASHBOARD_VISIBILITIES)[number];

/** Durable operation used to publish, abort, revoke, or delete snapshots. */
export type DashboardSnapshotTransitionKind =
  (typeof DASHBOARD_SNAPSHOT_TRANSITION_KINDS)[number];

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

    /**
     * Whether the dashboard is public. Derived in Postgres from `visibility`,
     * so it is read-only: it appears on `Read` and on neither `Insert` nor
     * `Update`.
     */
    isPublic: boolean;

    /** Publication state. Write this, not `isPublic`. */
    visibility: DashboardVisibility;

    /** Restricted unless caller has explicit grants (RBAC). */
    isRestricted: boolean;

    /** The dashboard's name. */
    name: string;

    /** The dashboard's owner id. */
    ownerId: UserId;

    /** The dashboard's owner profile id. */
    ownerProfileId: UserProfileId;

    /** The dashboard's slug. */
    slug: string | undefined;

    /** UUID of the complete snapshot generation readers may access. */
    snapshotRevision?: string;

    /** Durable mutually-exclusive snapshot transition kind. */
    snapshotTransitionKind?: DashboardSnapshotTransitionKind;

    /** Prior committed revision retained while a transition is active. */
    snapshotTransitionPriorRevision?: string;

    /** Prior audience retained while a transition is active. */
    snapshotTransitionPriorVisibility?: DashboardVisibility;

    /** Durable transition token and publish staging revision. */
    snapshotTransitionRevision?: string;

    /** Audience a durable publish transition will commit. */
    snapshotTransitionTargetVisibility?: DashboardVisibility;

    /** Timestamp of when the Dashboard was last updated. */
    updatedAt: string;

    /** Workspace id the Dashboard belongs to. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * CRUD type definitions for the Dashboard model.
 */
export type DashboardModel = SupabaseCrudModelSpec<
  {
    tableName: "dashboards";
    modelName: "Dashboard";
    modelPrimaryKeyType: DashboardId;
    modelTypes: {
      Read: DashboardRead;
      Insert: SetOptional<
        Omit<DashboardRead, "isPublic">,
        | "createdAt"
        | "id"
        | "isRestricted"
        | "snapshotRevision"
        | "snapshotTransitionKind"
        | "snapshotTransitionPriorRevision"
        | "snapshotTransitionPriorVisibility"
        | "snapshotTransitionRevision"
        | "snapshotTransitionTargetVisibility"
        | "updatedAt"
        | "visibility"
      >;
      Update: Partial<Omit<DashboardRead, "isPublic">>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
