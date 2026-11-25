import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return {
    clearCachedDatasetRows: vi.fn(),
    invalidateDatasetRowQueries: vi.fn(),
    invalidateCrosswalkQueries: vi.fn(() => {
      return Promise.resolve();
    }),
  };
});

function _named(name: string) {
  return {
    getClientName: () => {
      return name;
    },
  };
}

vi.mock("@/views/DataManagerApp/DatasetMetaView/clearCachedDatasetRows", () => {
  return { clearCachedDatasetRows: mocks.clearCachedDatasetRows };
});
vi.mock(
  "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries",
  () => {
    return { invalidateDatasetRowQueries: mocks.invalidateDatasetRowQueries };
  },
);
vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return { VirtualDatasetClient: _named("VirtualDatasetClient") };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: _named("DatasetClient") };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: _named("DatasetColumnClient") };
});
vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", () => {
  return { DictionaryBindingClient: _named("DictionaryBindingClient") };
});
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/invalidateCrosswalkQueries",
  () => {
    return { invalidateCrosswalkQueries: mocks.invalidateCrosswalkQueries };
  },
);

const { clearCombinedDatasetCaches } =
  await import("@/lib/crosswalks/clearCombinedDatasetCaches/clearCombinedDatasetCaches");

const OPTIONS = {
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
  userId: "44444444-4444-4444-8444-444444444444" as User.Id,
  workspaceId: "33333333-3333-4333-8333-333333333333" as Workspace.Id,
};

function _seedQueryClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    ["VirtualDatasetClient", "getAll", { where: {} }],
    [{ rawSql: "old" }],
  );
  for (const name of [
    "DatasetClient",
    "DatasetColumnClient",
    "DictionaryBindingClient",
    "DashboardClient",
  ]) {
    queryClient.setQueryData([name, "getAll"], []);
  }
  return queryClient;
}

describe("clearCombinedDatasetCaches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("drops this tab's cached rows for the combined dataset", async () => {
    await clearCombinedDatasetCaches({
      queryClient: _seedQueryClient(),
      ...OPTIONS,
    });

    expect(mocks.clearCachedDatasetRows).toHaveBeenCalledWith(OPTIONS);
  });

  it("removes cached virtual datasets so the next read fetches the new SQL", async () => {
    const queryClient = _seedQueryClient();
    await clearCombinedDatasetCaches({ queryClient, ...OPTIONS });

    expect(
      queryClient.getQueryData([
        "VirtualDatasetClient",
        "getAll",
        { where: {} },
      ]),
    ).toBeUndefined();
  });

  it("marks the dataset, its columns, its bindings, the crosswalks, and every row query stale", async () => {
    const queryClient = _seedQueryClient();
    await clearCombinedDatasetCaches({ queryClient, ...OPTIONS });

    for (const name of [
      "DatasetClient",
      "DatasetColumnClient",
      "DictionaryBindingClient",
    ]) {
      expect(queryClient.getQueryState([name, "getAll"])?.isInvalidated).toBe(
        true,
      );
    }
    expect(
      queryClient.getQueryState(["DashboardClient", "getAll"])?.isInvalidated,
    ).toBe(false);
    expect(mocks.invalidateDatasetRowQueries).toHaveBeenCalledWith(queryClient);
    expect(mocks.invalidateCrosswalkQueries).toHaveBeenCalledWith(queryClient);
  });
});
