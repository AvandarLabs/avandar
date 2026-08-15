import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicSnapshotDuckDbOwner } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const SECOND_DATASET_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const PUBLIC_OWNER = {
  bucket: "published",
  dashboardId: DASHBOARD_ID,
  snapshotRevision: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const satisfies PublicSnapshotDuckDbOwner;

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function _createDeferred(): Deferred {
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function _stubWorker(): void {
  vi.stubGlobal(
    "Worker",
    class {
      addEventListener(): void {}

      terminate(): void {}
    },
  );
}

async function _importDuckDbModules() {
  const [{ DuckDbClient }, { DatasetDuckDbCoordinator }] = await Promise.all([
    import("@/clients/DuckDbClient/DuckDbClient"),
    import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator"),
  ]);
  return { DuckDbClient, DatasetDuckDbCoordinator };
}

async function _waitForQueuedOperations(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function _assertOperationBlocksLaterWork(
  options: Readonly<{
    operationStarted: Deferred;
    releaseOperation: Deferred;
    operationPromise: Promise<unknown>;
    expectedError?: string;
  }>,
): Promise<void> {
  const { DatasetDuckDbCoordinator } = await _importDuckDbModules();
  await options.operationStarted.promise;
  let hasLaterOperationStarted = false;
  const laterOperation =
    DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [DATASET_ID],
      operation: async () => {
        hasLaterOperationStarted = true;
      },
    });
  await _waitForQueuedOperations();
  expect(hasLaterOperationStarted).toBe(false);
  options.releaseOperation.resolve();
  if (options.expectedError !== undefined) {
    await expect(options.operationPromise).rejects.toThrow(
      options.expectedError,
    );
  } else {
    await options.operationPromise;
  }
  await laterOperation;
  expect(hasLaterOperationStarted).toBe(true);
}

async function _assertUnleasedDropDoesNotDeadlock(
  options: Readonly<{
    relationType: string;
    hasView: boolean;
    hasTable: boolean;
  }>,
): Promise<void> {
  vi.resetModules();
  _stubWorker();
  const dropQueryStarted = _createDeferred();
  queryMock.mockImplementation(async (sql: string) => {
    if (sql.startsWith(`DROP ${options.relationType.toUpperCase()}`)) {
      dropQueryStarted.resolve();
    }
    return {
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    };
  });
  const { DuckDbClient } = await _importDuckDbModules();
  vi.spyOn(DuckDbClient, "hasView").mockResolvedValue(options.hasView);
  vi.spyOn(DuckDbClient, "hasTable").mockResolvedValue(options.hasTable);
  const dropPromise = DuckDbClient.dropTableViewAndFile({
    tableOrViewName: DATASET_ID,
  });
  const hasDropQueryStarted = await Promise.race([
    dropQueryStarted.promise.then(() => {
      return true;
    }),
    new Promise<false>((resolve) => {
      setTimeout(() => {
        return resolve(false);
      }, 0);
    }),
  ]);
  expect(hasDropQueryStarted).toBe(true);
  await dropPromise;
}

const { dropFileMock, queryMock, registerFileHandleMock } = vi.hoisted(() => {
  return {
    dropFileMock: vi.fn(),
    queryMock: vi.fn(),
    registerFileHandleMock: vi.fn(),
  };
});

vi.mock("@/clients/DuckDbClient/duckDbManualBundles", () => {
  return {
    buildManualDuckDbBundles: () => {
      return {};
    },
  };
});

vi.mock("@/clients/DuckDbClient/shouldLoadDuckDbNetworkExtensions", () => {
  return {
    shouldLoadDuckDbNetworkExtensions: () => {
      return false;
    },
  };
});

vi.mock("@/config/FeatureFlagConfig", () => {
  return {
    FeatureFlag: { DisableDuckDbSpatial: "disable-duckdb-spatial" },
    isFlagEnabled: () => {
      return false;
    },
  };
});

vi.mock("@/utils/Logger", () => {
  const logger = {
    appendName: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  };
  logger.appendName.mockReturnValue(logger);
  return { Logger: logger };
});

vi.mock("@duckdb/duckdb-wasm", () => {
  const connection = {
    close: vi.fn(),
    query: queryMock,
  };

  class MockAsyncDuckDb {
    connect = vi.fn(async () => {
      return connection;
    });

    dropFile = dropFileMock;

    registerFileHandle = registerFileHandleMock;

    instantiate = vi.fn();

    terminate = vi.fn();
  }

  return {
    AsyncDuckDB: MockAsyncDuckDb,
    ConsoleLogger: class {},
    DuckDBDataProtocol: { BROWSER_FILEREADER: 0 },
    selectBundle: vi.fn(async () => {
      return { mainModule: "duckdb.wasm", mainWorker: "duckdb.worker.js" };
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  dropFileMock.mockReset();
  queryMock.mockReset();
  registerFileHandleMock.mockReset();
  vi.unstubAllGlobals();
});

describe("DuckDbClient public snapshot ownership", () => {
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
    const dropStarted = _createDeferred();
    const dropMayFinish = _createDeferred();
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
      await _assertUnleasedDropDoesNotDeadlock({
        relationType,
        hasView,
        hasTable,
      });
    },
  );

  it("holds the dataset lease for the complete direct parquet load", async () => {
    vi.resetModules();
    _stubWorker();
    const { DuckDbClient } = await _importDuckDbModules();
    const loadStarted = _createDeferred();
    const loadMayFinish = _createDeferred();
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
    await _assertOperationBlocksLaterWork({
      operationStarted: loadStarted,
      releaseOperation: loadMayFinish,
      operationPromise: loadPromise,
    });
  });

  it("holds the dataset lease while a direct editor import is deferred", async () => {
    vi.resetModules();
    _stubWorker();
    const { DuckDbClient } = await _importDuckDbModules();
    const importStarted = _createDeferred();
    const importMayFail = _createDeferred();
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
    await _assertOperationBlocksLaterWork({
      operationStarted: importStarted,
      releaseOperation: importMayFail,
      operationPromise: importPromise,
      expectedError: "deferred import failure",
    });
  });

  it("holds the dataset lease through a direct raw query", async () => {
    vi.resetModules();
    _stubWorker();
    const queryStarted = _createDeferred();
    const queryMayFinish = _createDeferred();
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
    const { DuckDbClient } = await _importDuckDbModules();

    const queryPromise = DuckDbClient.runRawQuery(
      `SELECT * FROM "${DATASET_ID}"`,
    );
    await _assertOperationBlocksLaterWork({
      operationStarted: queryStarted,
      releaseOperation: queryMayFinish,
      operationPromise: queryPromise,
    });
  });

  it("rejects direct raw workspace reads of public-owned tables", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM "${DATASET_ID}"`),
    ).rejects.toThrow(/workspace.*public|public.*workspace/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("allows an explicitly public read while the public owner is current", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM "${DATASET_ID}"`, {
        datasetTableReadMode: "public",
        publicSnapshotDuckDbOwner: PUBLIC_OWNER,
      }),
    ).resolves.toMatchObject({ data: [] });
    expect(queryMock).toHaveBeenCalled();
  });

  it("requires the expected owner for explicitly public reads", async () => {
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

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM "${DATASET_ID}"`, {
        datasetTableReadMode: "public",
      }),
    ).rejects.toThrow(/expected.*owner/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects mutations in explicitly public mode", async () => {
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

    await expect(
      DuckDbClient.runRawQuery(`UPDATE "${DATASET_ID}" SET value = 1`, {
        datasetTableReadMode: "public",
        publicSnapshotDuckDbOwner: PUBLIC_OWNER,
      }),
    ).rejects.toThrow(/public.*read-only/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects direct raw workspace reads of invalid tables", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid(DATASET_ID);

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM "${DATASET_ID}"`),
    ).rejects.toThrow(/workspace.*invalid|invalid.*workspace/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects direct DESCRIBE reads of public-owned tables", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(`DESCRIBE "${DATASET_ID}"`),
    ).rejects.toThrow(/workspace.*public|public.*workspace/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects direct structured workspace reads of public-owned tables", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runStructuredQuery({ tableName: DATASET_ID }),
    ).rejects.toThrow(/workspace.*public|public.*workspace/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects direct structured workspace reads of invalid tables", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid(DATASET_ID);

    await expect(
      DuckDbClient.runStructuredQuery({ tableName: DATASET_ID }),
    ).rejects.toThrow(/workspace.*invalid|invalid.*workspace/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("poisons a raw mutation target before execution and after failure", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockRejectedValue(new Error("mutation failed"));
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(`UPDATE "${DATASET_ID}" SET value = 1`),
    ).rejects.toThrow("mutation failed");
    expect(
      DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner(DATASET_ID),
    ).toBe(true);
    expect(
      DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({
        datasetId: DATASET_ID,
        owner: PUBLIC_OWNER,
      }),
    ).toBe(false);
    expect(queryMock).toHaveBeenCalledOnce();
  });

  it("validates COPY and DELETE USING read ownership", async () => {
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
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: SECOND_DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(
        `COPY '${SECOND_DATASET_ID}' TO '${SECOND_DATASET_ID}.temp' (FORMAT 'parquet', COMPRESSION 'ZSTD')`,
      ),
    ).rejects.toThrow(/workspace.*public|public.*workspace/i);
    await expect(
      DuckDbClient.runRawQuery(
        `DELETE FROM "${DATASET_ID}" USING "${SECOND_DATASET_ID}" WHERE true`,
      ),
    ).rejects.toThrow(/workspace.*public|public.*workspace/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("poisons both table names before a failed rename", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockRejectedValue(new Error("rename failed"));
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");
    const { DatasetDuckDbCoordinator } =
      await import("@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator");

    await expect(
      DuckDbClient.runRawQuery(
        `ALTER TABLE "${DATASET_ID}" RENAME TO "${SECOND_DATASET_ID}"`,
      ),
    ).rejects.toThrow("rename failed");
    expect(
      DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner(DATASET_ID),
    ).toBe(true);
    expect(
      DatasetDuckDbCoordinator.hasPublicSnapshotDatasetOwner(SECOND_DATASET_ID),
    ).toBe(true);
    expect(queryMock).toHaveBeenCalledOnce();
  });

  it("rejects a mutation whose affected tables cannot be identified", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "Worker",
      class {
        addEventListener(): void {}

        terminate(): void {}
      },
    );
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } =
      await import("@/clients/DuckDbClient/DuckDbClient");

    await expect(
      DuckDbClient.runRawQuery("CALL mutate_unknown_table()"),
    ).rejects.toThrow(/inspect|safely execute/i);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
