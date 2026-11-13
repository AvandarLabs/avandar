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

function _binding(datasetId: string, entryId: string) {
  return { datasetId, entryId, dictionaryId: DICTIONARY_ID };
}

describe("useDictionaryUsage", () => {
  beforeEach(() => {
    mocks.isBindingsError = false;
    mocks.bindings = [
      _binding("dataset-kings", "entry-gender"),
      _binding("dataset-kings", "entry-gender"),
      _binding("dataset-kings", "entry-outcome"),
      _binding("dataset-bronx", "entry-gender"),
      _binding("dataset-hidden", "entry-gender"),
    ];
    mocks.datasets = [
      { id: "dataset-kings", name: "Kings line list" },
      { id: "dataset-bronx", name: "Bronx line list" },
    ];
  });

  it("counts each entry once, sorts by name, and leaves out unreadable datasets", () => {
    const { result } = renderHook(() => {
      return useDictionaryUsage(DICTIONARY_ID);
    });

    expect(result.current.rows).toEqual([
      {
        datasetId: "dataset-bronx",
        datasetName: "Bronx line list",
        entryCount: 1,
      },
      {
        datasetId: "dataset-kings",
        datasetName: "Kings line list",
        entryCount: 2,
      },
    ]);
    expect(result.current.hasError).toBe(false);
  });

  it("reports a failed read", () => {
    mocks.isBindingsError = true;
    const { result } = renderHook(() => {
      return useDictionaryUsage(DICTIONARY_ID);
    });

    expect(result.current.hasError).toBe(true);
  });
});
