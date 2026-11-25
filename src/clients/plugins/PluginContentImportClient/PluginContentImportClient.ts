import { PluginContentImportParsers } from "$/models/PluginContentImport/PluginContentImport";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads and records the plugin content a workspace imported as datasets. For
 * example, the install wizard reads it to skip content the workspace already
 * has, and inserts a row once an item's dataset is uploaded.
 */
export const PluginContentImportClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginContentImport",
    tableName: "plugin_content_imports",
    dbTablePrimaryKey: "id",
    parsers: PluginContentImportParsers,
  }),
);
