import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

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

vi.mock("@/clients/qetl/QetlClient/QetlClient", () => {
  return {
    QetlClientFactory: { create: createMock },
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
    (options: { getDiceFromSql: (rawSql: string) => Promise<string[]> }) => {
      return {
        runQuery: async ({ rawSql }: { rawSql: string }) => {
          return { rows: await options.getDiceFromSql(rawSql) };
        },
      };
    },
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublicQetlClient.runQuery", () => {
  it("resolves constant query_table sources from the published dataset list", async () => {
    vi.resetModules();
    const { PublicQetlClient } =
      await import("@/clients/qetl/PublicQetlClient/PublicQetlClient");

    await expect(
      PublicQetlClient.runQuery({
        rawSql: `SELECT * FROM query_table('${DATASET_ID}')`,
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).resolves.toEqual({ rows: [DATASET_ID] });
  });

  it("rejects uninspectable sources in public queries", async () => {
    vi.resetModules();
    const { PublicQetlClient } =
      await import("@/clients/qetl/PublicQetlClient/PublicQetlClient");

    await expect(
      PublicQetlClient.runQuery({
        rawSql: "SELECT * FROM query_table(dataset_name)",
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toThrow(/dynamic/i);
    await expect(
      PublicQetlClient.runQuery({
        rawSql: `SELECT * FROM read_parquet('${DATASET_ID}.parquet')`,
        dashboardId: DASHBOARD_ID,
        visibility: "public",
        snapshotRevision: FIRST_REVISION,
      }),
    ).rejects.toThrow(/inspect/i);
  });

  it("ignores eligible dataset IDs used only as literals or CTE aliases", async () => {
    vi.resetModules();
    const { PublicQetlClient } =
      await import("@/clients/qetl/PublicQetlClient/PublicQetlClient");

    await expect(
      PublicQetlClient.runQuery({
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
    const { PublicQetlClient } =
      await import("@/clients/qetl/PublicQetlClient/PublicQetlClient");

    await PublicQetlClient.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: FIRST_REVISION,
    });
    await PublicQetlClient.runQuery({
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
    const { PublicQetlClient } =
      await import("@/clients/qetl/PublicQetlClient/PublicQetlClient");

    await PublicQetlClient.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: FIRST_REVISION,
    });
    await PublicQetlClient.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "workspace",
      snapshotRevision: SECOND_REVISION,
    });
    await PublicQetlClient.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: THIRD_REVISION,
    });

    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("writes the committed snapshot revision into the Dexie cache", async () => {
    vi.resetModules();
    const { PublicQetlClient } =
      await import("@/clients/qetl/PublicQetlClient/PublicQetlClient");

    await PublicQetlClient.runQuery({
      rawSql: `select * from ${DATASET_ID}`,
      dashboardId: DASHBOARD_ID,
      visibility: "public",
      snapshotRevision: THIRD_REVISION,
    });
    const qetlOptions = createMock.mock.calls.at(-1)?.[0] as {
      insertToStorageCache: (
        facts: ReadonlyArray<{ datasetId: Dataset.Id; parquetBlob: Blob }>,
      ) => Promise<void>;
    };
    await qetlOptions.insertToStorageCache([
      { datasetId: DATASET_ID, parquetBlob: new Blob(["snapshot"]) },
    ]);

    expect(bulkInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ snapshotRevision: THIRD_REVISION })],
      }),
    );
  });
});
