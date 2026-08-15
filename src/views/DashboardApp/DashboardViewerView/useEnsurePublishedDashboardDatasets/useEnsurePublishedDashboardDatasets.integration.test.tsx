import { Model } from "@avandar/models";
import { AvaQueryProvider } from "@avandar/query-hooks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import { useEnsurePublishedDashboardDatasets } from "@/views/DashboardApp/DashboardViewerView/useEnsurePublishedDashboardDatasets/useEnsurePublishedDashboardDatasets";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const FIRST_REVISION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECOND_REVISION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let queryClientForTest: QueryClient;

const { loadDatasetsToMemoryMock } = vi.hoisted(() => {
  return { loadDatasetsToMemoryMock: vi.fn() };
});

vi.mock(
  "@/clients/dashboards/extractDatasetIdsFromDashboardConfig/extractDatasetIdsFromDashboardConfig",
  () => {
    return {
      extractDatasetIdsFromDashboardConfig: () => {
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

function _createDashboard(snapshotRevision: string): Dashboard.T {
  const now = "2026-08-14T00:00:00.000Z";
  return Model.make("Dashboard", {
    id: DASHBOARD_ID,
    config: {},
    createdAt: now,
    description: undefined,
    isPublic: true,
    isRestricted: false,
    name: "Dashboard",
    ownerId: "33333333-3333-4333-8333-333333333333" as User.Id,
    ownerProfileId: "44444444-4444-4444-8444-444444444444" as UserProfile.Id,
    slug: undefined,
    snapshotRevision,
    updatedAt: now,
    workspaceId: "55555555-5555-4555-8555-555555555555" as Workspace.Id,
    visibility: "public",
  });
}

type Props = { children: ReactNode };

function QueryWrapper({ children }: Readonly<Props>): ReactNode {
  return (
    <QueryClientProvider client={queryClientForTest}>
      <AvaQueryProvider onError={vi.fn()}>{children}</AvaQueryProvider>
    </QueryClientProvider>
  );
}

function _buildQueryKey(snapshotRevision: string): unknown[] {
  return [
    "public-datasets",
    DASHBOARD_ID,
    "public",
    snapshotRevision,
    [DATASET_ID],
  ];
}

describe("useEnsurePublishedDashboardDatasets React Query lifecycle", () => {
  beforeEach(() => {
    loadDatasetsToMemoryMock.mockReset();
  });

  it("keeps a cold-restored successful query unready until DuckDB is rebuilt", async () => {
    let resolveLoad: (() => void) | undefined;
    type LoadResult = { loadedDatasetIds: readonly Dataset.Id[] };
    const loadPromise = new Promise<LoadResult>((resolve) => {
      resolveLoad = () => {
        resolve({ loadedDatasetIds: [DATASET_ID] });
      };
    });
    loadDatasetsToMemoryMock.mockReturnValue(loadPromise);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClientForTest = queryClient;
    queryClient.setQueryData(_buildQueryKey(FIRST_REVISION), {
      loadedDatasetIds: [DATASET_ID],
    });

    const { result } = renderHook(
      () => {
        return useEnsurePublishedDashboardDatasets(
          _createDashboard(FIRST_REVISION),
        );
      },
      { wrapper: QueryWrapper },
    );

    await waitFor(() => {
      expect(loadDatasetsToMemoryMock).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isLoadingDatasets).toBe(true);

    resolveLoad?.();
    await waitFor(() => {
      expect(result.current.isLoadingDatasets).toBe(false);
    });
  });

  it("rebuilds each time navigation returns from revision B to cached revision A", async () => {
    loadDatasetsToMemoryMock.mockResolvedValue({
      loadedDatasetIds: [DATASET_ID],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClientForTest = queryClient;
    queryClient.setQueryData(_buildQueryKey(FIRST_REVISION), {
      loadedDatasetIds: [DATASET_ID],
    });
    queryClient.setQueryData(_buildQueryKey(SECOND_REVISION), {
      loadedDatasetIds: [DATASET_ID],
    });

    const { rerender } = renderHook(
      ({ snapshotRevision }: { snapshotRevision: string }) => {
        return useEnsurePublishedDashboardDatasets(
          _createDashboard(snapshotRevision),
        );
      },
      {
        initialProps: { snapshotRevision: FIRST_REVISION },
        wrapper: QueryWrapper,
      },
    );
    await waitFor(() => {
      expect(loadDatasetsToMemoryMock).toHaveBeenCalledTimes(1);
    });

    rerender({ snapshotRevision: SECOND_REVISION });
    await waitFor(() => {
      expect(loadDatasetsToMemoryMock).toHaveBeenCalledTimes(2);
    });

    rerender({ snapshotRevision: FIRST_REVISION });
    await waitFor(() => {
      expect(loadDatasetsToMemoryMock).toHaveBeenCalledTimes(3);
    });
    expect(
      loadDatasetsToMemoryMock.mock.calls.map(([params]) => {
        return params.snapshotRevision;
      }),
    ).toEqual([FIRST_REVISION, SECOND_REVISION, FIRST_REVISION]);
  });
});
