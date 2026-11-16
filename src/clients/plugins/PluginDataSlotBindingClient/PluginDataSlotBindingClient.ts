import { PluginDataSlotBindingParsers } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/**
 * Reads and writes which workspace records a plugin's data slots read. A
 * slot is bound or rebound through `saveBinding`, which replaces the slot's
 * binding in one call. Unbinding a slot is a plain `delete`.
 */
export const PluginDataSlotBindingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginDataSlotBinding",
    tableName: "plugin_data_slot_bindings",
    dbTablePrimaryKey: "id",
    parsers: PluginDataSlotBindingParsers,
    mutations: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * Binds one data slot of an install, replacing its binding when it
         * has one, and returns the saved binding.
         */
        saveBinding: async (params: {
          installationId: PluginInstallation.Id;
          draft: PluginDataSlotBinding.Draft;
        }): Promise<PluginDataSlotBinding.T> => {
          const logger = clientLogger.appendName("saveBinding");
          logger.log("Saving data slot binding", params);
          const { draft } = params;
          const { data } = await dbClient
            .rpc("rpc_plugin_data_slot_bindings__save", {
              p_installation_id: params.installationId,
              p_slot_id: draft.slotId,
              p_source_type: draft.sourceType,
              p_concept_id: draft.conceptId,
              p_dataset_id: draft.datasetId,
              p_attribute_map: draft.attributeMap,
            })
            .throwOnError();
          return parsers.fromDBReadToModelRead(data);
        },
      };
    },
  }),
  {
    mutationFns: ["saveBinding"],
  },
);
