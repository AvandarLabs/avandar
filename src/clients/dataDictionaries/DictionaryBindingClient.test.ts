import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { DictionaryBindingClient } = await import("./DictionaryBindingClient");

const DATASET_ID = uuid<Dataset.Id>();
const CODE_LIST_ID = uuid<DataDictionaryCodeList.Id>();
const CONVERTED: DictionaryBinding.Input = {
  datasetColumnId: uuid<DatasetColumn.Id>(),
  dictionaryId: uuid<DataDictionary.Id>(),
  entryId: uuid<DataDictionaryEntry.Id>(),
  codeListId: CODE_LIST_ID,
  mode: "convert",
  direction: "decode",
  keepsOriginal: true,
  valueOverrides: [
    { value: "7", action: "empty" },
    { value: "M ", action: "map", code: "1" },
    { value: "X", action: "keep" },
  ],
  isPinned: true,
};
const DESCRIBED: DictionaryBinding.Input = {
  ...CONVERTED,
  codeListId: undefined,
  mode: "reference",
  keepsOriginal: false,
  valueOverrides: [],
  isPinned: false,
};
const ADDED: DictionaryBinding.AddedPair = {
  codeListId: CODE_LIST_ID,
  code: "4",
  label: "Other",
};

function _resolveWith(data: unknown): void {
  rpcMock.mockReturnValue({
    throwOnError: () => {
      return Promise.resolve({ data });
    },
  });
}

describe("DictionaryBindingClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies bindings and added pairs in place in the RPC's shape", async () => {
    _resolveWith(2);

    const count = await DictionaryBindingClient.applyToDataset({
      datasetId: DATASET_ID,
      bindings: [CONVERTED, DESCRIBED],
      addedPairs: [ADDED],
    });

    expect(count).toBe(2);
    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_dataset_columns__apply_dictionaries",
      {
        p_dataset_id: DATASET_ID,
        p_bindings: [
          {
            dataset_column_id: CONVERTED.datasetColumnId,
            dictionary_id: CONVERTED.dictionaryId,
            entry_id: CONVERTED.entryId,
            code_list_id: CODE_LIST_ID,
            mode: "convert",
            direction: "decode",
            keeps_original: true,
            value_overrides: [
              { value: "7", action: "empty" },
              { value: "M ", action: "map", code: "1" },
              { value: "X", action: "keep" },
            ],
            is_pinned: true,
          },
          {
            dataset_column_id: DESCRIBED.datasetColumnId,
            dictionary_id: DESCRIBED.dictionaryId,
            entry_id: DESCRIBED.entryId,
            code_list_id: null,
            mode: "reference",
            direction: "decode",
            keeps_original: false,
            value_overrides: [],
            is_pinned: false,
          },
        ],
        p_added_pairs: [
          { code_list_id: CODE_LIST_ID, code: "4", label: "Other" },
        ],
      },
    );
  });

  it("creates a linked dataset in one call and returns its id", async () => {
    const linkedDatasetId = uuid<Dataset.Id>();
    _resolveWith(linkedDatasetId);

    const createdId = await DictionaryBindingClient.applyAsLinkedDataset({
      sourceDatasetId: DATASET_ID,
      linkedDatasetId,
      linkedDatasetName: "Bronx line list (labeled)",
      bindings: [{ ...CONVERTED, isPinned: false }],
      addedPairs: [],
    });

    expect(createdId).toBe(linkedDatasetId);
    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_dataset_columns__apply_dictionaries_as_linked_dataset",
      expect.objectContaining({
        p_source_dataset_id: DATASET_ID,
        p_linked_dataset_id: linkedDatasetId,
        p_linked_dataset_name: "Bronx line list (labeled)",
        p_added_pairs: [],
      }),
    );
    const [, args] = rpcMock.mock.calls[0] ?? [];
    expect(args.p_bindings[0]).toMatchObject({
      mode: "convert",
      is_pinned: false,
    });
  });
});
