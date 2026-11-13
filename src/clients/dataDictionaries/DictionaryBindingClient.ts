import { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _bindingToRpcArg(binding: DictionaryBinding.Input) {
  return {
    dataset_column_id: binding.datasetColumnId,
    dictionary_id: binding.dictionaryId,
    entry_id: binding.entryId,
    code_list_id: binding.codeListId ?? null,
    mode: binding.mode,
    direction: binding.direction,
  };
}

/**
 * Reads the dictionary bindings of dataset columns, and replaces a dataset's
 * bindings in one call with `applyToDataset`. Bindings are never written row
 * by row, so a dataset never holds half of an apply.
 */
export const DictionaryBindingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "DictionaryBinding",
    tableName: "dataset_columns__dictionary_bindings",
    dbTablePrimaryKey: "id",
    parsers: DictionaryBindingParsers,
    mutations: ({ clientLogger, dbClient }) => {
      return {
        /**
         * Replaces every binding of one dataset with `bindings` in one
         * transaction and returns how many were written. A refusal rejects
         * with the RPC's `hint`.
         */
        applyToDataset: async (
          options: Readonly<{
            datasetId: Dataset.Id;
            bindings: readonly DictionaryBinding.Input[];
          }>,
        ): Promise<number> => {
          const logger = clientLogger.appendName("applyToDataset");
          logger.log("Applying dictionaries", {
            datasetId: options.datasetId,
            bindingCount: options.bindings.length,
          });
          const { data } = await dbClient
            .rpc("rpc_dataset_columns__apply_dictionaries", {
              p_dataset_id: options.datasetId,
              p_bindings: options.bindings.map(_bindingToRpcArg),
            })
            .throwOnError();
          return data;
        },
      };
    },
  }),
  {
    mutationFns: ["applyToDataset"],
  },
);
