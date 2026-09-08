import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a persisted AvaMap row. */
export type AvaMapId = UUID<"AvaMap">;

/** The persisted row for a map and its editable configuration. */
export type AvaMapRead = Model.Base<
  "AvaMap",
  {
    /** The map's basemap, camera, bookmarks, and ordered layer stack. */
    config: AvaMapConfig.T;

    /** Timestamp of when the map was created. */
    createdAt: string;

    /** The map's description. */
    description: string | undefined;

    /** The map's unique identifier. */
    id: AvaMapId;

    /** Inert because no public route or policy consumes this column. */
    isPublic: boolean;

    /** Restricted unless the caller has explicit grants (RBAC). */
    isRestricted: boolean;

    /** The map's name, shown in the top bar's title input. */
    name: string;

    /** The map's owner id. */
    ownerId: User.Id;

    /** The map's owner profile id. */
    ownerProfileId: UserProfile.Id;

    /** Inert because no public route or policy consumes this column. */
    slug: string | undefined;

    /** Timestamp of when the map was last updated. */
    updatedAt: string;

    /** Workspace id the map belongs to. */
    workspaceId: Workspace.Id;
  }
>;

type AvaMapCrudSpec = {
  tableName: "maps";
  modelName: "AvaMap";
  modelPrimaryKeyType: AvaMapId;
  modelTypes: {
    Read: AvaMapRead;
    Insert: SetOptional<
      AvaMapRead,
      "createdAt" | "id" | "isPublic" | "isRestricted" | "updatedAt"
    >;
    Update: Partial<AvaMapRead>;
  };
};

/** CRUD type definitions for the AvaMap model. */
export type AvaMapModel = SupabaseCrudModelSpec<
  AvaMapCrudSpec,
  {
    dbTablePrimaryKey: "id";
  }
>;
