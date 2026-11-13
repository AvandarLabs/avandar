import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useDictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";

const mocks = vi.hoisted(() => {
  return {
    bindings: [] as unknown[],
    datasets: [] as unknown[],
    isBindingsError: false,
  };
});

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      useGetAll: () => {
        return [mocks.bindings, false, { isError: mocks.isBindingsError }];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      // Row-level security returns only the datasets the user can read.
      useGetAll: () => {
        return [mocks.datasets, false, { isError: false }];
      },
    },
  };
});
const DICTIONARY_ID = "dictionary-1" as DataDictionary.Id;

function _binding(
  datasetId: string,
  entryId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    datasetId,
    entryId,
    dictionaryId: DICTIONARY_ID,
    mode: "reference",
    codeListId: "list-sex",
    pinnedPairs: undefined,
    appliedDictionaryVersion: 3,
    ...overrides,
  };
}

const PINNED = {
  mode: "convert",
  pinnedPairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
};

describe("useDictionaryUsage", () => {
  beforeEach(() => {
    mocks.isBindingsError = false;
    mocks.bindings = [
      _binding("dataset-kings", "entry-gender"),
      _binding("dataset-kings", "entry-gender"),
      _binding("dataset-kings", "entry-outcome"),
      _binding("dataset-bronx", "entry-gender", {
        ...PINNED,
        appliedDictionaryVersion: 2,
      }),
      _binding("dataset-bronx", "entry-outcome", {
        ...PINNED,
        appliedDictionaryVersion: 3,
      }),
      _binding("dataset-labeled", "entry-gender", { mode: "convert" }),
      _binding("dataset-hidden", "entry-gender"),
    ];
    mocks.datasets = [
      { id: "dataset-kings", name: "Kings line list", sourceType: "csv_file" },
      { id: "dataset-bronx", name: "Bronx line list", sourceType: "csv_file" },
      {
        id: "dataset-labeled",
        name: "Kings line list (labeled)",
        sourceType: "virtual",
      },
    ];
  });

  it("says how each readable dataset uses the dictionary, sorted by name", () => {
    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        currentVersion: 3,
      });
    });

    expect(result.current.rows).toEqual([
      {
        datasetId: "dataset-bronx",
        datasetName: "Bronx line list",
        sourceType: "csv_file",
        entryCount: 2,
        howApplied: "changed",
        appliedVersion: 2,
        isBehind: true,
      },
      {
        datasetId: "dataset-kings",
        datasetName: "Kings line list",
        sourceType: "csv_file",
        entryCount: 2,
        howApplied: "reference",
        appliedVersion: undefined,
        isBehind: false,
      },
      {
        datasetId: "dataset-labeled",
        datasetName: "Kings line list (labeled)",
        sourceType: "virtual",
        entryCount: 1,
        howApplied: "linked",
        appliedVersion: undefined,
        isBehind: false,
      },
    ]);
    expect(result.current.currentVersion).toBe(3);
    expect(result.current.hasError).toBe(false);
  });

  it("does not count a binding pinned because its code list was deleted", () => {
    mocks.bindings = [
      _binding("dataset-labeled", "entry-gender", {
        ...PINNED,
        codeListId: undefined,
        appliedDictionaryVersion: 1,
      }),
    ];
    mocks.datasets = [
      {
        id: "dataset-labeled",
        name: "Kings line list (labeled)",
        sourceType: "virtual",
      },
    ];

    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        currentVersion: 3,
      });
    });

    expect(result.current.rows[0]).toMatchObject({
      howApplied: "linked",
      appliedVersion: undefined,
      isBehind: false,
    });
  });

  it("reports a failed read", () => {
    mocks.isBindingsError = true;
    const { result } = renderHook(() => {
      return useDictionaryUsage({
        dictionaryId: DICTIONARY_ID,
        currentVersion: 3,
      });
    });
    expect(result.current.hasError).toBe(true);
  });
});
