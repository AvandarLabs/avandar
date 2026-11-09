import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const mocks = vi.hoisted(() => {
  return {
    clearCachedDatasetRows: vi.fn(),
    invalidateDatasetRowQueries: vi.fn(),
  };
});

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
  return {
    VirtualDatasetClient: {
      getClientName: () => {
        return "VirtualDatasetClient";
      },
    },
  };
});

const { refreshPlacesDatasetCaches } =
  await import("@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches");

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
  queryClient.setQueryData([OPTIONS.workspaceId, "mapLayerData", "layer-1"], {
    type: "rows",
  });
  queryClient.setQueryData(["DashboardClient", "getAll"], []);
  return queryClient;
}

describe("refreshPlacesDatasetCaches", () => {
  it("drops this tab's cached rows for the dataset", async () => {
    await refreshPlacesDatasetCaches({
      queryClient: _seedQueryClient(),
      ...OPTIONS,
    });
    expect(mocks.clearCachedDatasetRows).toHaveBeenCalledWith(OPTIONS);
  });

  it("removes cached virtual rows so the next read fetches the new SQL", async () => {
    const queryClient = _seedQueryClient();
    await refreshPlacesDatasetCaches({ queryClient, ...OPTIONS });
    expect(
      queryClient.getQueryData([
        "VirtualDatasetClient",
        "getAll",
        { where: {} },
      ]),
    ).toBeUndefined();
  });

  it("marks map layer queries stale and leaves unrelated queries alone", async () => {
    const queryClient = _seedQueryClient();
    await refreshPlacesDatasetCaches({ queryClient, ...OPTIONS });
    expect(
      queryClient.getQueryState([
        OPTIONS.workspaceId,
        "mapLayerData",
        "layer-1",
      ])?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(["DashboardClient", "getAll"])?.isInvalidated,
    ).toBe(false);
  });

  it("marks every dataset row query stale", async () => {
    const queryClient = _seedQueryClient();
    await refreshPlacesDatasetCaches({ queryClient, ...OPTIONS });
    expect(mocks.invalidateDatasetRowQueries).toHaveBeenCalledWith(queryClient);
  });
});
