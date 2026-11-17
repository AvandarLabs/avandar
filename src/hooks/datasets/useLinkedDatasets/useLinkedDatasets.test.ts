import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLinkedDatasets } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";
import { renderHook } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type QueryFlags = { isFetching: boolean; isError: boolean };

const NO_FLAGS: QueryFlags = { isFetching: false, isError: false };

const mocks = vi.hoisted(() => {
  return {
    virtualDatasets: [] as unknown[],
    datasets: [] as unknown[],
    bindings: [] as unknown[],
    virtualFlags: { isFetching: false, isError: false } as QueryFlags,
    datasetsFlags: { isFetching: false, isError: false } as QueryFlags,
    bindingsFlags: { isFetching: false, isError: false } as QueryFlags,
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      useGetAll: () => {
        return [mocks.virtualDatasets, false, mocks.virtualFlags];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [mocks.datasets, false, mocks.datasetsFlags];
      },
    },
  };
});
vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return {
    DictionaryBindingClient: {
      useGetAll: () => {
        return [mocks.bindings, false, mocks.bindingsFlags];
      },
    },
  };
});

const SOURCE_ID = "dataset-source" as Dataset.Id;

describe("useLinkedDatasets", () => {
  beforeEach(() => {
    mocks.virtualFlags = NO_FLAGS;
    mocks.datasetsFlags = NO_FLAGS;
    mocks.bindingsFlags = NO_FLAGS;
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

  it("reports neither fetching nor failure once every lookup settles", () => {
    const { result } = renderHook(() => {
      return useLinkedDatasets(SOURCE_ID);
    });

    expect(result.current).toMatchObject({
      isFetching: false,
      hasFailed: false,
    });
  });

  it.each([
    ["virtual datasets", "virtualFlags"],
    ["datasets", "datasetsFlags"],
    ["dictionary bindings", "bindingsFlags"],
  ] as const)("reports fetching while the %s refetch", (_name, flagsKey) => {
    mocks[flagsKey] = { isFetching: true, isError: false };

    const { result } = renderHook(() => {
      return useLinkedDatasets(SOURCE_ID);
    });

    expect(result.current.isFetching).toBe(true);
  });

  it.each([
    ["virtual datasets", "virtualFlags"],
    ["datasets", "datasetsFlags"],
    ["dictionary bindings", "bindingsFlags"],
  ] as const)("reports a failure when the %s lookup fails", (_name, flagsKey) => {
    mocks[flagsKey] = { isFetching: false, isError: true };

    const { result } = renderHook(() => {
      return useLinkedDatasets(SOURCE_ID);
    });

    expect(result.current.hasFailed).toBe(true);
  });

  it("ignores a stale failure of a lookup that is not enabled", () => {
    mocks.virtualDatasets = [];
    mocks.datasetsFlags = { isFetching: false, isError: true };

    const { result } = renderHook(() => {
      return useLinkedDatasets(SOURCE_ID);
    });

    expect(result.current.hasFailed).toBe(false);
  });

  it.each([
    ["datasets", "datasetsFlags"],
    ["dictionary bindings", "bindingsFlags"],
  ] as const)(
    "ignores a stale fetching flag on the %s when nothing reads the dataset",
    (_name, flagsKey) => {
      mocks.virtualDatasets = [];
      mocks[flagsKey] = { isFetching: true, isError: false };

      const { result } = renderHook(() => {
        return useLinkedDatasets(SOURCE_ID);
      });

      expect(result.current.isFetching).toBe(false);
    },
  );
});
