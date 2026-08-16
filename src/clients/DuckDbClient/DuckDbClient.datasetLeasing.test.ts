import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertOperationBlocksLaterWork,
  assertUnleasedDropDoesNotDeadlock,
  createDeferred,
  DATASET_ID,
  dropFileMock,
  importDuckDbModules,
  PUBLIC_OWNER,
  queryMock,
  registerFileHandleMock,
  resetDuckDbOwnershipMocks,
  stubWorker,
} from "@/clients/DuckDbClient/DuckDbClient.ownership.fixtures";

afterEach(() => {
  resetDuckDbOwnershipMocks();
});

describe("DuckDbClient dataset leasing", () => {
  it("invalidates public ownership before a central table drop", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    vi.spyOn(DuckDbClient, "hasView").mockResolvedValue(false);
    vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(false);
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await DuckDbClient.dropTableViewAndFile({ tableOrViewName: DATASET_ID });

    expect(
      DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({
        datasetId: DATASET_ID,
        owner: PUBLIC_OWNER,
      }),
    ).toBe(false);
    expect(dropFileMock).toHaveBeenCalledWith(DATASET_ID);
  });

  it("poisons ownership when a central table drop fails", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    dropFileMock.mockRejectedValue(new Error("drop failed"));
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    vi.spyOn(DuckDbClient, "hasView").mockResolvedValue(false);
    vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(false);
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.dropTableViewAndFile({ tableOrViewName: DATASET_ID }),
    ).rejects.toThrow("drop failed");
    expect(
      DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner(DATASET_ID),
    ).toBe(true);
    expect(
      DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({
        datasetId: DATASET_ID,
        owner: PUBLIC_OWNER,
      }),
    ).toBe(false);
  });

  it("finishes a direct drop before later work on the same dataset starts", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    const dropStarted = createDeferred();
    const dropMayFinish = createDeferred();
    vi.spyOn(DuckDbClient, "hasView").mockImplementation(async () => {
      dropStarted.resolve();
      await dropMayFinish.promise;
      return false;
    });
    vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(false);

    const dropPromise = DuckDbClient.dropTableViewAndFile({
      tableOrViewName: DATASET_ID,
    });
    await dropStarted.promise;
    let hasLaterOperationStarted = false;
    const laterOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [DATASET_ID],
        operation: async () => {
          hasLaterOperationStarted = true;
        },
      });
    await Promise.resolve();
    await Promise.resolve();

    expect(hasLaterOperationStarted).toBe(false);
    dropMayFinish.resolve();
    await Promise.all([dropPromise, laterOperation]);
    expect(hasLaterOperationStarted).toBe(true);
  });

  it.each([
    { relationType: "view", hasView: true, hasTable: false },
    { relationType: "table", hasView: false, hasTable: true },
  ])(
    "does not deadlock an unleased drop of an existing $relationType",
    async ({ relationType, hasView, hasTable }) => {
      await assertUnleasedDropDoesNotDeadlock({
        relationType,
        hasView,
        hasTable,
      });
    },
  );

  it("holds the dataset lease for the complete direct parquet load", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient } = await importDuckDbModules();
    const loadStarted = createDeferred();
    const loadMayFinish = createDeferred();
    vi.spyOn(DuckDbClient, "hasView").mockResolvedValue(false);
    vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(false);
    vi.spyOn(DuckDbClient, "runRawQuery").mockResolvedValue(new Blob());
    vi.spyOn(DuckDbClient, "getTableSchema").mockResolvedValue([]);
    vi.spyOn(DuckDbClient, "getTableRowCount").mockResolvedValue(0);
    registerFileHandleMock.mockImplementation(async () => {
      loadStarted.resolve();
      await loadMayFinish.promise;
    });

    const loadPromise = DuckDbClient.loadParquet({
      tableName: DATASET_ID,
      blob: new Blob([], { type: "application/vnd.apache.parquet" }),
    });
    await assertOperationBlocksLaterWork({
      operationStarted: loadStarted,
      releaseOperation: loadMayFinish,
      operationPromise: loadPromise,
    });
  });

  it("holds the dataset lease while a direct editor import is deferred", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient } = await importDuckDbModules();
    const importStarted = createDeferred();
    const importMayFail = createDeferred();
    vi.spyOn(DuckDbClient, "hasView").mockResolvedValue(false);
    vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(false);
    registerFileHandleMock.mockImplementation(async () => {
      importStarted.resolve();
      await importMayFail.promise;
      throw new Error("deferred import failure");
    });

    const importPromise = DuckDbClient.loadCsv({
      tableName: DATASET_ID,
      file: new File(["value\n1"], "dataset.csv", { type: "text/csv" }),
    });
    await assertOperationBlocksLaterWork({
      operationStarted: importStarted,
      releaseOperation: importMayFail,
      operationPromise: importPromise,
      expectedError: "deferred import failure",
    });
  });

  it("holds the dataset lease through a direct raw query", async () => {
    vi.resetModules();
    stubWorker();
    const queryStarted = createDeferred();
    const queryMayFinish = createDeferred();
    const emptyArrowTable = {
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    };
    queryMock.mockResolvedValueOnce(emptyArrowTable);
    queryMock.mockImplementation(async () => {
      queryStarted.resolve();
      await queryMayFinish.promise;
      return emptyArrowTable;
    });
    const { DuckDbClient } = await importDuckDbModules();

    const queryPromise = DuckDbClient.runRawQuery(
      `SELECT * FROM "${DATASET_ID}"`,
    );
    await assertOperationBlocksLaterWork({
      operationStarted: queryStarted,
      releaseOperation: queryMayFinish,
      operationPromise: queryPromise,
    });
  });
});
