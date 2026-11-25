import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateAfterDictionaryDelete } from "@/views/DataManagerApp/DataDictionaryView/DataDictionaryActionsMenu/invalidateAfterDictionaryDelete/invalidateAfterDictionaryDelete";

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
vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return { DictionaryBindingClient: _named("DictionaryBindingClient") };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: _named("DatasetColumnClient") };
});
vi.mock(
  "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries",
  () => {
    return { invalidateDatasetRowQueries: invalidateRowsMock };
  },
);

describe("invalidateAfterDictionaryDelete", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries");
  });

  it("refreshes the dictionaries, code lists, bindings, columns, and every row query", async () => {
    await invalidateAfterDictionaryDelete(queryClient);

    const names = vi
      .mocked(queryClient.invalidateQueries)
      .mock.calls.map((call) => {
        return (call[0] as { queryKey: unknown[] }).queryKey[0];
      });
    expect(names).toEqual([
      "DataDictionaryClient",
      "DataDictionaryCodeListClient",
      "DictionaryBindingClient",
      "DatasetColumnClient",
    ]);
    expect(invalidateRowsMock).toHaveBeenCalledWith(queryClient);
  });
});
