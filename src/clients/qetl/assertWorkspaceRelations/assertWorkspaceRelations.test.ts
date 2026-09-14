/** Tests per-relation workspace authorization for the QETL query path. */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertWorkspaceRelations } from "@/clients/qetl/assertWorkspaceRelations/assertWorkspaceRelations";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { QueryClient } from "@tanstack/react-query";

const WORKSPACE_ID = "55555555-5555-4555-8555-555555555555" as Workspace.Id;
const OWNED_DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const OTHER_OWNED_DATASET_ID =
  "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const FOREIGN_DATASET_ID = "44444444-4444-4444-8444-444444444444" as Dataset.Id;

const DATASETS_QUERY_KEY = ["Dataset", "getAll", WORKSPACE_ID];

const { fetchDatasetsMock } = vi.hoisted(() => {
  return { fetchDatasetsMock: vi.fn() };
});

// Mirrors the `staleTime` and `networkMode` that ship in
// `src/config/AvaQueryClient.ts`, because this assertion's freshness behavior
// is part of what it promises. Replicated rather than imported because the real
// module pulls in the whole `ServerApiClient` graph. `retry` is deliberately
// not mirrored: these tests count `queryFn` calls and a retry would double
// them.
vi.mock("@/config/AvaQueryClient", async () => {
  const { QueryClient: TanstackQueryClient } =
    await import("@tanstack/react-query");
  const { getIsOnline } = await import("@avandar/browser-utils");
  return {
    AvaQueryClient: new TanstackQueryClient({
      defaultOptions: {
        queries: {
          staleTime: () => {
            return getIsOnline() ? 6 * 60 * 1000 : Number.POSITIVE_INFINITY;
          },
          networkMode: "offlineFirst",
          retry: false,
        },
      },
    }),
  };
});

// Mirrors the real `withQueryHooks` wiring: `withFetchQuery()` runs the client
// function through `queryClient.fetchQuery` under the key `QueryKeys` builds,
// so a fetch populates the same entry a later call reads.
//
// `withEnsureQueryData` is mocked too even though the implementation does not
// use it. That is deliberate: it is the variant this module deliberately does
// NOT use, and without it here, swapping one for the other fails with a
// TypeError instead of failing on the staleness difference that is the actual
// reason for the choice. A mutation has to be able to fail for the right
// reason.
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      withCache: (queryClient: QueryClient) => {
        return {
          withFetchQuery: () => {
            return {
              getAll: async () => {
                return await queryClient.fetchQuery({
                  queryKey: DATASETS_QUERY_KEY,
                  queryFn: fetchDatasetsMock,
                });
              },
            };
          },
          withEnsureQueryData: () => {
            return {
              getAll: async () => {
                return await queryClient.ensureQueryData({
                  queryKey: DATASETS_QUERY_KEY,
                  queryFn: fetchDatasetsMock,
                });
              },
            };
          },
        };
      },
    },
  };
});

function makeDatasetList(
  datasetIds: readonly Dataset.Id[],
): Array<{ id: Dataset.Id }> {
  return datasetIds.map((id) => {
    return { id };
  });
}

async function getThrownError(promise: Promise<unknown>): Promise<unknown> {
  return await promise.then(
    () => {
      return undefined;
    },
    (error: unknown) => {
      return error;
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  AvaQueryClient.clear();
  fetchDatasetsMock.mockResolvedValue(
    makeDatasetList([OWNED_DATASET_ID, OTHER_OWNED_DATASET_ID]),
  );
});

describe("assertWorkspaceRelations", () => {
  it("returns every reference when all of them belong to the workspace", async () => {
    await expect(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [OWNED_DATASET_ID, OTHER_OWNED_DATASET_ID],
      }),
    ).resolves.toEqual([OWNED_DATASET_ID, OTHER_OWNED_DATASET_ID]);
  });

  it("refuses a reference to a dataset outside the workspace", async () => {
    const error = await getThrownError(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [FOREIGN_DATASET_ID],
      }),
    );

    expect(error).toBeInstanceOf(WorkspaceRelationsDenied);
    expect((error as WorkspaceRelationsDenied).deniedDatasetIds).toEqual([
      FOREIGN_DATASET_ID,
    ]);
  });

  it("refuses the whole statement when only one of several references is foreign", async () => {
    // The positive control is the first test: the same owned id resolves fine
    // on its own, so this failing proves the foreign id is what refuses it and
    // that an authorized sibling does not rescue the statement.
    const error = await getThrownError(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [OWNED_DATASET_ID, FOREIGN_DATASET_ID],
      }),
    );

    expect(error).toBeInstanceOf(WorkspaceRelationsDenied);
    expect((error as WorkspaceRelationsDenied).deniedDatasetIds).toEqual([
      FOREIGN_DATASET_ID,
    ]);
  });

  it("does not silently drop a foreign reference", async () => {
    // The behavior this replaces intersected the references with the workspace
    // list and returned the remainder, so this exact call resolved to
    // `[OWNED_DATASET_ID]` instead of refusing. Pinning the non-result keeps
    // that regression from coming back as a "simplification".
    const result = await assertWorkspaceRelations({
      workspaceId: WORKSPACE_ID,
      referencedDatasetIds: [OWNED_DATASET_ID, FOREIGN_DATASET_ID],
    }).catch(() => {
      return "refused" as const;
    });

    expect(result).toBe("refused");
    expect(result).not.toEqual([OWNED_DATASET_ID]);
  });

  it("refuses every reference when the workspace has no datasets", async () => {
    // An empty list is an answer, not a cache miss worth retrying. A dataset
    // list that reads as empty must deny rather than admit.
    fetchDatasetsMock.mockResolvedValue(makeDatasetList([]));

    const error = await getThrownError(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [OWNED_DATASET_ID],
      }),
    );

    expect(error).toBeInstanceOf(WorkspaceRelationsDenied);
  });

  it("deduplicates references so a self-join is not reported twice", async () => {
    await expect(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [OWNED_DATASET_ID, OWNED_DATASET_ID],
      }),
    ).resolves.toEqual([OWNED_DATASET_ID]);
  });

  it("reads no dataset list for a statement that names no relation", async () => {
    await expect(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [],
      }),
    ).resolves.toEqual([]);

    // Positive control: the very next call, with a reference, does read.
    expect(fetchDatasetsMock).not.toHaveBeenCalled();
    await assertWorkspaceRelations({
      workspaceId: WORKSPACE_ID,
      referencedDatasetIds: [OWNED_DATASET_ID],
    });
    expect(fetchDatasetsMock).toHaveBeenCalledTimes(1);
  });

  it("propagates a failure to read the dataset list instead of denying", async () => {
    // "We could not find out" must stay distinguishable from "you may not".
    const readFailure = new Error("network down");
    fetchDatasetsMock.mockRejectedValue(readFailure);

    const error = await getThrownError(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [OWNED_DATASET_ID],
      }),
    );

    expect(error).toBe(readFailure);
    expect(error).not.toBeInstanceOf(WorkspaceRelationsDenied);
  });

  it("honors invalidation, so a revoked dataset stops authorizing", async () => {
    // The behavior this pins is why the read is `fetchQuery` and not
    // `ensureQueryData`: `ensureQueryData` resolves from any present entry
    // however stale, so the second call below would still have admitted the
    // dataset after it left the workspace.
    await assertWorkspaceRelations({
      workspaceId: WORKSPACE_ID,
      referencedDatasetIds: [OWNED_DATASET_ID],
    });
    expect(fetchDatasetsMock).toHaveBeenCalledTimes(1);

    fetchDatasetsMock.mockResolvedValue(
      makeDatasetList([OTHER_OWNED_DATASET_ID]),
    );
    await AvaQueryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });

    const error = await getThrownError(
      assertWorkspaceRelations({
        workspaceId: WORKSPACE_ID,
        referencedDatasetIds: [OWNED_DATASET_ID],
      }),
    );

    expect(error).toBeInstanceOf(WorkspaceRelationsDenied);
    expect(fetchDatasetsMock).toHaveBeenCalledTimes(2);
  });

  it("serves a fresh cache entry without a second read", async () => {
    // The warm path must stay free: authorization runs on every query.
    await assertWorkspaceRelations({
      workspaceId: WORKSPACE_ID,
      referencedDatasetIds: [OWNED_DATASET_ID],
    });
    await assertWorkspaceRelations({
      workspaceId: WORKSPACE_ID,
      referencedDatasetIds: [OTHER_OWNED_DATASET_ID],
    });

    expect(fetchDatasetsMock).toHaveBeenCalledTimes(1);
  });
});
