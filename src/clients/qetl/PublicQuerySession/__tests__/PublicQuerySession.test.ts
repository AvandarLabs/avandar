import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makePrincipalKeyFromPublicSession } from "$/models/relations/RelationCacheKey/RelationCacheKey";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const FIRST_REVISION = "2026-08-14T00:00:00.000Z";
const SECOND_REVISION = "2026-08-14T01:00:00.000Z";
const THIRD_REVISION = "2026-08-14T02:00:00.000Z";

const { bulkInsertMock, createMock, listDatasetIdsForDashboardMock } =
  vi.hoisted(() => {
    return {
      bulkInsertMock: vi.fn(),
      createMock: vi.fn(),
      listDatasetIdsForDashboardMock: vi.fn(),
    };
  });

vi.mock("@avandar/modules", () => {
  return {
    createModule: (_name: string, options: { builder: () => object }) => {
      return options.builder();
    },
  };
});

vi.mock("@/clients/qetl/QueryMediator/QueryMediator", () => {
  return {
    QueryMediatorFactory: { create: createMock },
  };
});

vi.mock(
  "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient",
  () => {
    return {
      PublicDatasetParquetStorageClient: {
        listDatasetIdsForDashboard: listDatasetIdsForDashboardMock,
      },
    };
  },
);

vi.mock(
  "@/clients/datasets/LocalPublicDatasetClient/LocalPublicDatasetClient",
  () => {
    return {
      LocalPublicDatasetClient: { bulkInsert: bulkInsertMock },
    };
  },
);

beforeEach(() => {
  vi.clearAllMocks();
  listDatasetIdsForDashboardMock.mockResolvedValue([DATASET_ID]);
  createMock.mockImplementation(
    (options: {
      getQueryDependencies: (rawSql: string) => Promise<string[]>;
    }) => {
      return {
        runQuery: async ({ rawSql }: { rawSql: string }) => {
          return { rows: await options.getQueryDependencies(rawSql) };
        },
      };
    },
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicQuerySession.runQuery", () => {
  it("resolves constant query_table sources from the published dataset list", async () => {
    vi.resetModules();
    const { PublicQuerySession } =
      await import("@/clients/qetl/PublicQuerySession/PublicQuerySession");

    await expect(
      PublicQuerySession.runQuery({
        rawSql: `SELECT * FROM query_table('${DATASET_ID}')`,
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).resolves.toEqual({ rows: [DATASET_ID] });
  });

  it("rejects uninspectable sources in public queries", async () => {
    vi.resetModules();
    const { PublicQuerySession } =
      await import("@/clients/qetl/PublicQuerySession/PublicQuerySession");

    await expect(
      PublicQuerySession.runQuery({
        rawSql: "SELECT * FROM query_table(dataset_name)",
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toThrow(/dynamic/i);
    await expect(
      PublicQuerySession.runQuery({
        rawSql: `SELECT * FROM read_parquet('${DATASET_ID}.parquet')`,
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toThrow(/inspect/i);
  });

  it("ignores eligible dataset IDs used only as literals or CTE aliases", async () => {
    vi.resetModules();
    const { PublicQuerySession } =
      await import("@/clients/qetl/PublicQuerySession/PublicQuerySession");

    await expect(
      PublicQuerySession.runQuery({
        rawSql: [
          `WITH "${DATASET_ID}" AS (`,
          `SELECT '${DATASET_ID}' AS dataset_id`,
          `) SELECT * FROM "${DATASET_ID}"`,
        ].join(" "),
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).resolves.toEqual({ rows: [] });
  });

  it("caches clients by visibility and lists snapshot datasets from the mapped bucket", async () => {
    vi.resetModules();
    const { PublicQuerySession } =
      await import("@/clients/qetl/PublicQuerySession/PublicQuerySession");

    await PublicQuerySession.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: FIRST_REVISION,
    });
    await PublicQuerySession.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      snapshotRevision: FIRST_REVISION,
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(listDatasetIdsForDashboardMock).toHaveBeenNthCalledWith(1, {
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: FIRST_REVISION,
    });
    expect(listDatasetIdsForDashboardMock).toHaveBeenNthCalledWith(2, {
      bucket: "published-private",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: FIRST_REVISION,
    });
  });

  it("does not reuse the old public client after public-workspace-public", async () => {
    vi.resetModules();
    const { PublicQuerySession } =
      await import("@/clients/qetl/PublicQuerySession/PublicQuerySession");

    await PublicQuerySession.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: FIRST_REVISION,
    });
    await PublicQuerySession.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      snapshotRevision: SECOND_REVISION,
    });
    await PublicQuerySession.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: THIRD_REVISION,
    });

    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("scopes its storage tier to the committed snapshot revision", async () => {
    // The session used to carry the revision in an `insertToStorageCache`
    // callback that only wrote. It now carries it in the principal every cache
    // entry is keyed by, which is what also governs reads: a query against one
    // revision cannot be served an entry written under another.
    vi.resetModules();
    const { PublicQuerySession } =
      await import("@/clients/qetl/PublicQuerySession/PublicQuerySession");

    await PublicQuerySession.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: THIRD_REVISION,
    });

    const qetlOptions = createMock.mock.calls.at(-1)?.[0] as {
      principalKey: string;
      relationCache: unknown;
    };

    // The tier itself, not just the key. Handing this session the workspace
    // tier is the cross-visibility bug that reordering the probe made hot.
    const { LocalPublicDatasetRelationCache } =
      await import("@/clients/qetl/RelationCache/LocalPublicDatasetRelationCache/LocalPublicDatasetRelationCache");
    expect(qetlOptions.relationCache).toBe(LocalPublicDatasetRelationCache);

    expect(qetlOptions.principalKey).toBe(
      makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: THIRD_REVISION,
      }),
    );
    // Negative control: a different revision must not produce the same key,
    // or the assertion above would hold no matter what the session did.
    expect(qetlOptions.principalKey).not.toBe(
      makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: `${THIRD_REVISION}-other`,
      }),
    );
  });
});
