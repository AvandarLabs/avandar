import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a plugin install. */
export type PluginInstallationId = UUID<"PluginInstallation">;

/** One plugin installed in one workspace. */
export type PluginInstallationRead = Model.Base<
  "PluginInstallation",
  {
    /** Timestamp of when the plugin was installed. */
    createdAt: string;

    /** Manifest permissions an admin approved. */
    grantedPermissions: string[];

    /** The install's unique identifier. */
    id: PluginInstallationId;

    /** User who installed the plugin, if that user still exists. */
    installedBy: User.Id | undefined;

    /** Manifest version when installed or last re-approved. */
    installedVersion: string;

    /** A disabled plugin contributes nothing. */
    isEnabled: boolean;

    /** Plugin id in `publisher.name` form. */
    pluginId: string;

    /** Timestamp of the last change to this install. */
    updatedAt: string;

    /** Workspace the plugin is installed in. */
    workspaceId: Workspace.Id;
  }
>;

type PluginInstallationCrudSpec = {
  tableName: "plugin_installations";
  modelName: "PluginInstallation";
  modelPrimaryKeyType: PluginInstallationId;
  modelTypes: {
    Read: PluginInstallationRead;
    Insert: SetOptional<
      PluginInstallationRead,
      "createdAt" | "id" | "installedBy" | "isEnabled" | "updatedAt"
    >;
    Update: Partial<PluginInstallationRead>;
  };
};

/** CRUD type definitions for the PluginInstallation model. */
export type PluginInstallationModel = SupabaseCrudModelSpec<
  PluginInstallationCrudSpec,
  { dbTablePrimaryKey: "id" }
>;
