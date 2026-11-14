import { CrosswalkParsers } from "$/models/crosswalks/Crosswalk/Crosswalk";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type SavePayload = Crosswalk.SavePayload;
type CombinePayload = Crosswalk.CombinePayload;

function _settingsToRpcArg(settings: SavePayload["settings"]) {
  return {
    name: settings.name,
    description: settings.description ?? null,
    codes_output_as: settings.codesOutputAs,
    adds_source_column: settings.addsSourceColumn,
  };
}

function _columnToRpcArg(column: SavePayload["columns"][number]) {
  return {
    id: column.id,
    name: column.name,
    position: column.position,
    data_type: column.dataType,
    entry_id: column.entryId ?? null,
  };
}

function _layoutToRpcArg(layout: SavePayload["layouts"][number]) {
  return {
    id: layout.id,
    signature: layout.signature,
    column_names: [...layout.columnNames],
    is_reference: layout.isReference,
    status: layout.status,
  };
}

function _mappingToRpcArg(mapping: SavePayload["mappings"][number]) {
  return {
    id: mapping.id,
    layout_id: mapping.layoutId,
    column_id: mapping.columnId,
    fill: CrosswalkMapping.fillToDBJson(mapping.fill),
    status: mapping.status,
    confidence: mapping.confidence ?? null,
    reason: mapping.reason ?? null,
  };
}

function _toSaveRpcArgs(payload: SavePayload) {
  return {
    p_crosswalk_id: payload.crosswalkId,
    p_settings: _settingsToRpcArg(payload.settings),
    p_columns: payload.columns.map(_columnToRpcArg),
    p_layouts: payload.layouts.map(_layoutToRpcArg),
    p_datasets: payload.datasets.map((membership) => {
      return {
        dataset_id: membership.datasetId,
        layout_id: membership.layoutId,
      };
    }),
    p_mappings: payload.mappings.map(_mappingToRpcArg),
  };
}

function _toCombineRpcArgs(payload: CombinePayload) {
  return {
    p_crosswalk_id: payload.crosswalkId,
    p_dataset_id: payload.datasetId,
    p_dataset_name: payload.datasetName,
    p_raw_sql: payload.rawSql,
    p_columns: payload.columns.map((column) => {
      return { name: column.name, data_type: column.dataType };
    }),
    p_bindings: payload.bindings.map((binding) => {
      return {
        column_name: binding.columnName,
        dictionary_id: binding.dictionaryId,
        entry_id: binding.entryId,
        code_list_id: binding.codeListId,
        direction: binding.direction,
      };
    }),
    p_compiled_code_lists: payload.compiledCodeLists.map((list) => {
      return { code_list_id: list.codeListId, fingerprint: list.fingerprint };
    }),
  };
}

/**
 * Reads, creates, renames, and deletes crosswalks. A crosswalk's columns,
 * layouts, memberships, and mappings are saved whole through
 * `saveContents`, never row by row, and its combined dataset is created or
 * updated through `saveCombinedDataset`.
 */
export const CrosswalkClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Crosswalk",
    tableName: "crosswalks",
    dbTablePrimaryKey: "id",
    parsers: CrosswalkParsers,
    mutations: ({ clientLogger, dbClient }) => {
      return {
        /**
         * Replaces one crosswalk's settings, columns, layouts, memberships,
         * and mappings in one transaction. A refusal rejects with the RPC's
         * `hint`; read it with `Crosswalk.toSaveErrorHint`.
         */
        saveContents: async (payload: SavePayload): Promise<void> => {
          clientLogger.appendName("saveContents").log("Saving crosswalk", {
            crosswalkId: payload.crosswalkId,
            layoutCount: payload.layouts.length,
            mappingCount: payload.mappings.length,
          });
          await dbClient
            .rpc("rpc_crosswalks__save", _toSaveRpcArgs(payload))
            .throwOnError();
        },

        /**
         * Creates the crosswalk's combined dataset, or updates it when the
         * crosswalk already has one, and returns its id. A refusal rejects
         * with the RPC's `hint`; read it with `Crosswalk.toCombineErrorHint`.
         */
        saveCombinedDataset: async (
          payload: CombinePayload,
        ): Promise<Dataset.Id> => {
          clientLogger
            .appendName("saveCombinedDataset")
            .log("Saving combined dataset", {
              crosswalkId: payload.crosswalkId,
              datasetId: payload.datasetId,
              columnCount: payload.columns.length,
            });
          const { data } = await dbClient
            .rpc(
              "rpc_crosswalks__save_combined_dataset",
              _toCombineRpcArgs(payload),
            )
            .throwOnError();
          return data as Dataset.Id;
        },
      };
    },
  }),
  {
    mutationFns: ["saveContents", "saveCombinedDataset"],
  },
);
