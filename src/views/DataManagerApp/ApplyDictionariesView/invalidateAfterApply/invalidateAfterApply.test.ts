import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateAfterApply } from "@/views/DataManagerApp/ApplyDictionariesView/invalidateAfterApply/invalidateAfterApply";

const { invalidateRowsMock } = vi.hoisted(() => {
  return { invalidateRowsMock: vi.fn() };
});

function _named(name: string) {
  return {
    getClientName: () => {
      return name;
    },
  };
}

vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return { DictionaryBindingClient: _named("DictionaryBindingClient") };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: _named("DatasetColumnClient") };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: _named("DatasetClient") };
});
vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return { VirtualDatasetClient: _named("VirtualDatasetClient") };
});
vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return { DataDictionaryClient: _named("DataDictionaryClient") };
  },
);
vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return {
    DataDictionaryCodeListClient: _named("DataDictionaryCodeListClient"),
  };
});
vi.mock(
  "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries",
  () => {
    return { invalidateDatasetRowQueries: invalidateRowsMock };
  },
);

function _invalidatedNames(queryClient: QueryClient): unknown[] {
  return vi.mocked(queryClient.invalidateQueries).mock.calls.map((call) => {
    return (call[0] as { queryKey: unknown[] }).queryKey[0];
  });
}

describe("invalidateAfterApply", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries");
  });

  it("refreshes bindings, columns, datasets, and every row query", async () => {
    await invalidateAfterApply(queryClient, { hasAddedPairs: false });

    expect(_invalidatedNames(queryClient)).toEqual([
      "DictionaryBindingClient",
      "DatasetColumnClient",
      "DatasetClient",
      "VirtualDatasetClient",
    ]);
    expect(invalidateRowsMock).toHaveBeenCalledWith(queryClient);
  });

  it("refreshes the dictionaries and code lists when values were added", async () => {
    await invalidateAfterApply(queryClient, { hasAddedPairs: true });

    expect(_invalidatedNames(queryClient)).toEqual(
      expect.arrayContaining([
        "DataDictionaryClient",
        "DataDictionaryCodeListClient",
      ]),
    );
  });
});
