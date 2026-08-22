import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DATASET_ID,
  PUBLIC_OWNER,
  queryMock,
  resetDuckDbOwnershipMocks,
  SECOND_DATASET_ID,
} from "@/clients/DuckDbClient/__tests__/DuckDbClient.ownership.fixtures";

afterEach(() => {
  resetDuckDbOwnershipMocks();
});

describe("DuckDbClient mutation poisoning", () => {
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
