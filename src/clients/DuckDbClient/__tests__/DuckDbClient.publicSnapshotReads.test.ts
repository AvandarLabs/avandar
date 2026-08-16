import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DATASET_ID,
  PUBLIC_OWNER,
  queryMock,
  resetDuckDbOwnershipMocks,
} from "@/clients/DuckDbClient/__tests__/DuckDbClient.ownership.fixtures";

afterEach(() => {
  resetDuckDbOwnershipMocks();
});

describe("DuckDbClient public snapshot reads", () => {
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
});
