import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLinkedDatasets } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";
import { renderHook } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    virtualDatasets: [] as unknown[],
    datasets: [] as unknown[],
    bindings: [] as unknown[],
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      useGetAll: () => {
        return [mocks.virtualDatasets, false];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [mocks.datasets, false];
      },
    },
  };
});
vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      useGetAll: () => {
        return [mocks.bindings, false];
      },
    },
  };
});

const SOURCE_ID = "dataset-source" as Dataset.Id;

describe("useLinkedDatasets", () => {
  beforeEach(() => {
    mocks.virtualDatasets = [
      { datasetId: "dataset-kings-labeled", linkedSourceDatasetId: SOURCE_ID },
      { datasetId: "dataset-bronx-labeled", linkedSourceDatasetId: SOURCE_ID },
    ];
    mocks.datasets = [
      { id: "dataset-kings-labeled", name: "Kings (labeled)" },
      { id: "dataset-bronx-labeled", name: "Bronx (labeled)" },
    ];
    mocks.bindings = [
      {
        datasetId: "dataset-kings-labeled",
        dictionaryId: "dict-nys",
        mode: "convert",
      },
      {
        datasetId: "dataset-kings-labeled",
        dictionaryId: "dict-cdc",
        mode: "reference",
      },
      {
        datasetId: "dataset-bronx-labeled",
        dictionaryId: undefined,
        mode: "convert",
      },
    ];
  });

  it("lists the datasets that read this one, by name, with the dictionaries they convert with", () => {
    const { result } = renderHook(() => {
      return useLinkedDatasets(SOURCE_ID);
    });

    expect(result.current.linkedDatasets).toEqual([
      {
        id: "dataset-bronx-labeled",
        name: "Bronx (labeled)",
        dictionaryIds: new Set(),
      },
      {
        id: "dataset-kings-labeled",
        name: "Kings (labeled)",
        dictionaryIds: new Set(["dict-nys"]),
      },
    ]);
  });

  it("lists none while nothing reads the dataset", () => {
    mocks.virtualDatasets = [];

    const { result } = renderHook(() => {
      return useLinkedDatasets(SOURCE_ID);
    });

    expect(result.current.linkedDatasets).toEqual([]);
  });
});
