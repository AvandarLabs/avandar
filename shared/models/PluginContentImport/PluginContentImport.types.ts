import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a plugin content import. */
export type PluginContentImportId = UUID<"PluginContentImport">;

/**
 * One plugin content item a workspace imported as a dataset. The install
 * wizard and the plugin card in Settings read it to tell which items the
 * workspace already has. It outlives the plugin's install.
 */
export type PluginContentImportRead = Model.Base<
  "PluginContentImport",
  {
    /** The manifest's content id, e.g. `provinces`. */
    contentId: string;

    /** Timestamp of when the item was imported. */
    createdAt: string;

    /** The dataset the item was imported as. */
    datasetId: Dataset.Id;

    /** The import's unique identifier. */
    id: PluginContentImportId;

    /** User who imported the item, if that user still exists. */
    importedBy: User.Id | undefined;

    /** Plugin id in `publisher.name` form. */
    pluginId: string;

    /** Workspace the item was imported into. */
    workspaceId: Workspace.Id;
  }
>;

type PluginContentImportCrudSpec = {
  tableName: "plugin_content_imports";
  modelName: "PluginContentImport";
  modelPrimaryKeyType: PluginContentImportId;
  modelTypes: {
    Read: PluginContentImportRead;
    Insert: SetOptional<
      PluginContentImportRead,
      "createdAt" | "id" | "importedBy"
    >;
    Update: Partial<PluginContentImportRead>;
  };
};

/** CRUD type definitions for the PluginContentImport model. */
export type PluginContentImportModel = SupabaseCrudModelSpec<
  PluginContentImportCrudSpec,
  { dbTablePrimaryKey: "id" }
>;
