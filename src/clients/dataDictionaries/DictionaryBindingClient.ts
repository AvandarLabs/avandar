import { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** What every apply sends: the bindings, and pairs to add to code lists. */
type ApplyRequest = Readonly<{
  bindings: readonly DictionaryBinding.Input[];
  addedPairs: readonly DictionaryBinding.AddedPair[];
}>;

function _overrideToRpcArg(override: DictionaryBinding.ValueOverride) {
  return override.action === "map"
    ? { value: override.value, action: override.action, code: override.code }
    : { value: override.value, action: override.action };
}

function _bindingToRpcArg(binding: DictionaryBinding.Input) {
  return {
    dataset_column_id: binding.datasetColumnId,
    dictionary_id: binding.dictionaryId,
    entry_id: binding.entryId,
    code_list_id: binding.codeListId ?? null,
    mode: binding.mode,
    direction: binding.direction,
    keeps_original: binding.keepsOriginal,
    value_overrides: binding.valueOverrides.map(_overrideToRpcArg),
    is_pinned: binding.isPinned,
  };
}

function _addedPairToRpcArg(pair: DictionaryBinding.AddedPair) {
  return { code_list_id: pair.codeListId, code: pair.code, label: pair.label };
}

function _toRpcArgs(request: ApplyRequest) {
  return {
    p_bindings: request.bindings.map(_bindingToRpcArg),
    p_added_pairs: request.addedPairs.map(_addedPairToRpcArg),
  };
}

/**
 * Reads the dictionary bindings of dataset columns. Writes replace a
 * dataset's bindings whole in one call: `applyToDataset` in place, and
 * `applyAsLinkedDataset` through a new linked dataset. Bindings are never
 * written row by row, so a dataset never holds half of an apply.
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
         * Adds `addedPairs` to their code lists, then replaces every binding
         * of one dataset with `bindings`, in one transaction. Returns how many
         * bindings the dataset has now. A refusal rejects with the RPC's
         * `hint`.
         */
        applyToDataset: async (
          options: ApplyRequest & Readonly<{ datasetId: Dataset.Id }>,
        ): Promise<number> => {
          clientLogger.appendName("applyToDataset").log("Applying", {
            datasetId: options.datasetId,
            bindingCount: options.bindings.length,
            addedPairCount: options.addedPairs.length,
          });
          const { data } = await dbClient
            .rpc("rpc_dataset_columns__apply_dictionaries", {
              p_dataset_id: options.datasetId,
              ..._toRpcArgs(options),
            })
            .throwOnError();
          return data;
        },

        /**
         * Creates a linked dataset over `sourceDatasetId` with live convert
         * bindings for every `convert` binding, and attaches the same
         * entries to the source as reference, in one transaction. Returns
         * the linked dataset's id. A refusal rejects with the RPC's `hint`.
         */
        applyAsLinkedDataset: async (
          options: ApplyRequest &
            Readonly<{
              sourceDatasetId: Dataset.Id;
              linkedDatasetId: Dataset.Id;
              linkedDatasetName: string;
            }>,
        ): Promise<Dataset.Id> => {
          clientLogger.appendName("applyAsLinkedDataset").log("Linking", {
            sourceDatasetId: options.sourceDatasetId,
            linkedDatasetId: options.linkedDatasetId,
            bindingCount: options.bindings.length,
          });
          const { data } = await dbClient
            .rpc("rpc_dataset_columns__apply_dictionaries_as_linked_dataset", {
              p_source_dataset_id: options.sourceDatasetId,
              p_linked_dataset_id: options.linkedDatasetId,
              p_linked_dataset_name: options.linkedDatasetName,
              ..._toRpcArgs(options),
            })
            .throwOnError();
          return data as Dataset.Id;
        },
      };
    },
  }),
  {
    mutationFns: ["applyToDataset", "applyAsLinkedDataset"],
  },
);
