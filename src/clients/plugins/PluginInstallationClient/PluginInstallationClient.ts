import { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/** Reads and writes the plugins installed in a workspace. */
export const PluginInstallationClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginInstallation",
    tableName: "plugin_installations",
    dbTablePrimaryKey: "id",
    parsers: PluginInstallationParsers,
  }),
);
