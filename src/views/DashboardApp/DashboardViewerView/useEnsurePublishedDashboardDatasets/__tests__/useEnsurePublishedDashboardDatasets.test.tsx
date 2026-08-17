import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useEnsurePublishedDashboardDatasets } from "@/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets/useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;

const { loadDatasetsToMemoryMock, useQueryMock } = vi.hoisted(() => {
  return {
    loadDatasetsToMemoryMock: vi.fn(),
    useQueryMock: vi.fn(),
  };
});

vi.mock("@avandar/query-hooks", () => {
  return { useQuery: useQueryMock };
});

vi.mock(
  "@/clients/dashboards/getDatasetIdsFromDashboardConfig/getDatasetIdsFromDashboardConfig",
  () => {
    return {
      getDatasetIdsFromDashboardConfig: () => {
        return [DATASET_ID];
      },
    };
  },
);

vi.mock(
  "@/clients/datasets/LocalPublicDatasetRawDataClient/LocalPublicDatasetRawDataClient",
  () => {
    return {
      LocalPublicDatasetRawDataClient: {
        useLoadDatasetsToMemory: () => {
          return [{ async: loadDatasetsToMemoryMock }];
        },
      },
    };
  },
);

function _makeDashboard(
  options: Readonly<{
    visibility: Dashboard.Visibility;
    snapshotRevision?: string | undefined;
  }>,
): Dashboard.T {
  const { visibility, snapshotRevision = "revision-a" } = options;
  const now = "2026-08-14T00:00:00.000Z";
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    config: {},
    createdAt: now,
    description: undefined,
    isPublic: visibility === "public",
    isRestricted: false,
    name: "Dashboard",
    ownerId: "33333333-3333-4333-8333-333333333333" as User.Id,
    ownerProfileId: "44444444-4444-4444-8444-444444444444" as UserProfile.Id,
    slug: undefined,
    snapshotRevision,
    updatedAt: "2026-08-14T01:00:00.000Z",
    workspaceId: "55555555-5555-4555-8555-555555555555" as Workspace.Id,
    visibility,
  });
}

type DatasetLoadQueryConfig = {
  enabled: boolean;
  queryFn: () => Promise<unknown>;
  queryKey: readonly unknown[];
  refetchOnMount: "always";
};

function _getLatestQueryConfig(): DatasetLoadQueryConfig {
  const queryConfig = useQueryMock.mock.calls.at(-1)?.[0];
  return queryConfig as DatasetLoadQueryConfig;
}

async function _assertSnapshotQuery(
  options: Readonly<{
    bucket: "published" | "published-private";
    visibility: Dashboard.Visibility;
  }>,
): Promise<void> {
  const queryConfig = _getLatestQueryConfig();
  expect(queryConfig.queryKey).toEqual([
    "public-datasets",
    DASHBOARD_ID,
    options.visibility,
    "revision-a",
    [DATASET_ID],
  ]);
  await queryConfig.queryFn();
  expect(loadDatasetsToMemoryMock).toHaveBeenLastCalledWith({
    bucket: options.bucket,
    dashboardId: DASHBOARD_ID,
    datasetIds: [DATASET_ID],
    snapshotRevision: "revision-a",
  });
}

describe("useEnsurePublishedDashboardDatasets", () => {
  it("uses the visibility-specific snapshot bucket and cache key", async () => {
    useQueryMock.mockReturnValue([undefined, false, { error: undefined }]);

    const { rerender } = renderHook(
      ({ visibility }: { visibility: Dashboard.Visibility }) => {
        return useEnsurePublishedDashboardDatasets(
          _makeDashboard({ visibility }),
        );
      },
      { initialProps: { visibility: "public" as Dashboard.Visibility } },
    );

    await _assertSnapshotQuery({
      bucket: "published",
      visibility: "public",
    });

    rerender({ visibility: "workspace" });
    await _assertSnapshotQuery({
      bucket: "published-private",
      visibility: "workspace",
    });
  });

  it("changes the cache key for a new committed snapshot revision", () => {
    useQueryMock.mockReturnValue([undefined, false, { error: undefined }]);

    const { rerender } = renderHook(
      ({ snapshotRevision }: { snapshotRevision: string }) => {
        return useEnsurePublishedDashboardDatasets(
          _makeDashboard({ visibility: "public", snapshotRevision }),
        );
      },
      { initialProps: { snapshotRevision: "revision-a" } },
    );

    const firstQueryKey = _getLatestQueryConfig().queryKey;
    rerender({ snapshotRevision: "revision-b" });

    expect(_getLatestQueryConfig().queryKey).not.toEqual(firstQueryKey);
  });

  it("reconstructs DuckDB after a persisted query success is restored", () => {
    useQueryMock.mockReturnValue([
      { loadedDatasetIds: [DATASET_ID] },
      false,
      { error: undefined, isFetching: true },
    ]);

    const { result } = renderHook(() => {
      return useEnsurePublishedDashboardDatasets(
        _makeDashboard({ visibility: "public" }),
      );
    });

    expect(_getLatestQueryConfig().refetchOnMount).toBe("always");
    expect(result.current).toEqual({
      isLoadingDatasets: true,
      error: undefined,
    });
  });

  it("always revalidates an A-to-B-to-A revision sequence", () => {
    useQueryMock.mockReturnValue([
      { loadedDatasetIds: [DATASET_ID] },
      false,
      { error: undefined, isFetching: false },
    ]);

    const { rerender } = renderHook(
      ({ snapshotRevision }: { snapshotRevision: string }) => {
        return useEnsurePublishedDashboardDatasets(
          _makeDashboard({ visibility: "public", snapshotRevision }),
        );
      },
      { initialProps: { snapshotRevision: "revision-a" } },
    );
    const firstRevisionConfig = _getLatestQueryConfig();

    rerender({ snapshotRevision: "revision-b" });
    const secondRevisionConfig = _getLatestQueryConfig();

    rerender({ snapshotRevision: "revision-a" });
    const restoredFirstRevisionConfig = _getLatestQueryConfig();

    expect([
      firstRevisionConfig.refetchOnMount,
      secondRevisionConfig.refetchOnMount,
      restoredFirstRevisionConfig.refetchOnMount,
    ]).toEqual(["always", "always", "always"]);
    expect(restoredFirstRevisionConfig.queryKey).toEqual(
      firstRevisionConfig.queryKey,
    );
  });

  it("does not enable snapshot loading for a draft dashboard", () => {
    useQueryMock.mockReturnValue([undefined, false, { error: undefined }]);

    renderHook(() => {
      return useEnsurePublishedDashboardDatasets(
        _makeDashboard({ visibility: "draft" }),
      );
    });

    expect(_getLatestQueryConfig().enabled).toBe(false);
  });

  it("does not mark a published dashboard without a committed revision ready", () => {
    useQueryMock.mockReturnValue([
      undefined,
      false,
      { error: undefined, isFetching: false },
    ]);

    renderHook(() => {
      return useEnsurePublishedDashboardDatasets({
        ..._makeDashboard({ visibility: "public" }),
        snapshotRevision: undefined,
      });
    });

    expect(_getLatestQueryConfig().enabled).toBe(false);
  });
});
