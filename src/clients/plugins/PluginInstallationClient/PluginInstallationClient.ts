import { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Json } from "$/types/database.types";

type PluginInstallParams = {
  workspaceId: Workspace.Id;
  pluginId: string;
  installedVersion: string;
  grantedPermissions: readonly string[];
  bindings: readonly PluginDataSlotBinding.Draft[];
};

function _makeBindingPayloadFromDraft(
  draft: PluginDataSlotBinding.Draft,
): Json {
  return {
    slot_id: draft.slotId,
    source_type: draft.sourceType,
    concept_id: draft.conceptId ?? null,
    dataset_id: draft.datasetId ?? null,
    attribute_map: draft.attributeMap,
  };
}

/**
 * Reads and writes the plugins installed in a workspace. A plugin is
 * installed through `install`, which writes the install and its data slot
 * bindings together.
 */
export const PluginInstallationClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginInstallation",
    tableName: "plugin_installations",
    dbTablePrimaryKey: "id",
    parsers: PluginInstallationParsers,
    mutations: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * Installs a plugin with its data slot bindings in one transaction
         * and returns the install. A binding that fails leaves no install
         * behind.
         */
        install: async (
          params: Readonly<PluginInstallParams>,
        ): Promise<PluginInstallation.T> => {
          const logger = clientLogger.appendName("install");
          logger.log("Installing plugin", params);
          const { data } = await dbClient
            .rpc("rpc_plugin_installations__install", {
              p_workspace_id: params.workspaceId,
              p_plugin_id: params.pluginId,
              p_installed_version: params.installedVersion,
              p_granted_permissions: [...params.grantedPermissions],
              p_bindings: params.bindings.map(_makeBindingPayloadFromDraft),
            })
            .throwOnError();
          return parsers.fromDBReadToModelRead(data);
        },
      };
    },
  }),
  {
    mutationFns: ["install"],
  },
);
