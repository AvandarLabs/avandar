import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DATASET_ID,
  importDuckDbModules,
  PUBLIC_OWNER,
  queryMock,
  resetDuckDbOwnershipMocks,
  stubWorker,
} from "@/clients/DuckDbClient/__tests__/DuckDbClient.ownership.fixtures";

/** A case type whose view a workspace query left in DuckDB. */
const CONCEPT_ID = "44444444-4444-4444-8444-444444444444";

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

  // A public snapshot builds no case type view, so a `concept_<id>` view in
  // DuckDB was built by a workspace query and belongs to no snapshot.
  it("rejects a public read of a case type's view", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient } = await importDuckDbModules();

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM "concept_${CONCEPT_ID}"`, {
        datasetTableReadMode: "public",
        publicSnapshotDuckDbOwner: PUBLIC_OWNER,
      }),
    ).rejects.toThrow(/only read published datasets/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects a public read that joins a published dataset to a case type's view", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient, DatasetDuckDbCoordinator } =
      await importDuckDbModules();
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(
        `SELECT * FROM "${DATASET_ID}" JOIN "concept_${CONCEPT_ID}" ON true`,
        {
          datasetTableReadMode: "public",
          publicSnapshotDuckDbOwner: PUBLIC_OWNER,
        },
      ),
    ).rejects.toThrow(/only read published datasets/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  // The analyzer cannot account for a spine table, so it refuses the
  // statement before any relation check runs.
  it("rejects a public read of a case type's spine table", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient } = await importDuckDbModules();

    await expect(
      DuckDbClient.runRawQuery(
        `SELECT * FROM "concept_${CONCEPT_ID}__individuals"`,
        {
          datasetTableReadMode: "public",
          publicSnapshotDuckDbOwner: PUBLIC_OWNER,
        },
      ),
    ).rejects.toThrow(/uninspectable-source/);
    expect(queryMock).not.toHaveBeenCalled();
  });

  // Internal tables name no dataset, so a relation check alone passes them.
  // A staging table can hold rows a workspace sync left behind.
  it("rejects a public read of an individuals staging table", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient } = await importDuckDbModules();

    await expect(
      DuckDbClient.runRawQuery(
        `SELECT * FROM "ava_staging_individuals_${CONCEPT_ID}"`,
        {
          datasetTableReadMode: "public",
          publicSnapshotDuckDbOwner: PUBLIC_OWNER,
        },
      ),
    ).rejects.toThrow(/only read published datasets/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects a public read that joins a published dataset to a staging table", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient, DatasetDuckDbCoordinator } =
      await importDuckDbModules();
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(
        `SELECT * FROM "${DATASET_ID}" JOIN "ava_staging_individuals_${CONCEPT_ID}" ON true`,
        {
          datasetTableReadMode: "public",
          publicSnapshotDuckDbOwner: PUBLIC_OWNER,
        },
      ),
    ).rejects.toThrow(/only read published datasets/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects a public read of reject_errors", async () => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient } = await importDuckDbModules();

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM reject_errors`, {
        datasetTableReadMode: "public",
        publicSnapshotDuckDbOwner: PUBLIC_OWNER,
      }),
    ).rejects.toThrow(/only read published datasets/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  // A common table expression and a subquery name no table of their own, so
  // neither counts as an internal table.
  it("still allows a public read through a CTE and a subquery", async () => {
    vi.resetModules();
    stubWorker();
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient, DatasetDuckDbCoordinator } =
      await importDuckDbModules();
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(
        `WITH recent AS (SELECT * FROM "${DATASET_ID}")
         SELECT * FROM recent JOIN (SELECT 1 AS id FROM range(3)) other ON true`,
        {
          datasetTableReadMode: "public",
          publicSnapshotDuckDbOwner: PUBLIC_OWNER,
        },
      ),
    ).resolves.toMatchObject({ data: [] });
  });

  // Each statement below returned private rows when it ran in real DuckDB, and
  // each one is refused before it reaches DuckDB.
  describe.each([
    ["TABLE as a subquery", `SELECT * FROM (TABLE "concept_${CONCEPT_ID}")`],
    [
      "PIVOT_WIDER",
      `SELECT * FROM (PIVOT_WIDER "concept_${CONCEPT_ID}" ON a USING max(a))`,
    ],
    [
      "PIVOT_LONGER",
      `SELECT * FROM (PIVOT_LONGER "concept_${CONCEPT_ID}" ON a INTO NAME n VALUE v)`,
    ],
    [
      "a CTE that shadows the view its own body reads",
      `WITH "concept_${CONCEPT_ID}" AS (SELECT * FROM "concept_${CONCEPT_ID}")
       SELECT * FROM "concept_${CONCEPT_ID}"`,
    ],
    [
      "a CTE that shadows the staging table its own body reads",
      `WITH "ava_staging_individuals_${CONCEPT_ID}" AS (
         SELECT * FROM "ava_staging_individuals_${CONCEPT_ID}"
       ) SELECT * FROM "ava_staging_individuals_${CONCEPT_ID}"`,
    ],
    [
      "a WINDOW name that looks like a CTE",
      `SELECT 'x' FROM range(1) WINDOW "concept_${CONCEPT_ID}" AS (ORDER BY 1)
       UNION ALL SELECT a FROM "concept_${CONCEPT_ID}"`,
    ],
    [
      "a nested block comment",
      `SELECT 1 /* /* */ ' */, (SELECT max(a) FROM "concept_${CONCEPT_ID}") --'`,
    ],
    [
      "an E string",
      `SELECT E'\\'', (SELECT max(a) FROM "concept_${CONCEPT_ID}") --'`,
    ],
    [
      "a dollar-quoted string",
      `SELECT $$'$$, (SELECT max(a) FROM "concept_${CONCEPT_ID}") --'`,
    ],
    [
      "a tagged dollar-quoted string",
      `SELECT $q$'$q$, (SELECT max(a) FROM "concept_${CONCEPT_ID}") --'`,
    ],
    [
      "a line comment ended by a carriage return",
      `SELECT 1 --x\r, (SELECT max(a) FROM "concept_${CONCEPT_ID}") AS leaked`,
    ],
    ["SHOW of a view", `SHOW "concept_${CONCEPT_ID}"`],
    ["SHOW TABLES", "SHOW TABLES"],
    ["SHOW ALL TABLES", "SHOW ALL TABLES"],
    [
      "a second statement that reads a view",
      `SELECT 1; TABLE "concept_${CONCEPT_ID}"`,
    ],
    ["a second statement that is a PRAGMA", "SELECT 1; PRAGMA threads=1"],
    ["a PRAGMA", "PRAGMA threads=1"],
    ["a second SELECT", "SELECT 1; SELECT 2"],
    ["TABLE as the statement", `TABLE "concept_${CONCEPT_ID}"`],
  ])("public read of %s", (_description, sql) => {
    it("is refused before it runs", async () => {
      vi.resetModules();
      stubWorker();
      const { DuckDbClient } = await importDuckDbModules();

      await expect(
        DuckDbClient.runRawQuery(sql, {
          datasetTableReadMode: "public",
          publicSnapshotDuckDbOwner: PUBLIC_OWNER,
        }),
      ).rejects.toThrow();
      expect(queryMock).not.toHaveBeenCalled();
    });
  });

  // Only a plain query may run in a public read. The analyzer can describe
  // these, but a snapshot has no use for them.
  it.each([
    ["DESCRIBE", `DESCRIBE "${DATASET_ID}"`],
    ["SUMMARIZE", `SUMMARIZE "${DATASET_ID}"`],
    ["EXPLAIN", `EXPLAIN SELECT * FROM "${DATASET_ID}"`],
  ])("refuses a public %s", async (_description, sql) => {
    vi.resetModules();
    stubWorker();
    const { DuckDbClient, DatasetDuckDbCoordinator } =
      await importDuckDbModules();
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(sql, {
        datasetTableReadMode: "public",
        publicSnapshotDuckDbOwner: PUBLIC_OWNER,
      }),
    ).rejects.toThrow(/only run a query/i);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a SELECT", `SELECT * FROM "${DATASET_ID}"`],
    ["a SELECT with a trailing semicolon", `SELECT * FROM "${DATASET_ID}";`],
    ["a WITH", `WITH a AS (SELECT * FROM "${DATASET_ID}") SELECT * FROM a`],
    ["a FROM-first query", `FROM "${DATASET_ID}" SELECT *`],
  ])("still allows a public read of %s", async (_description, sql) => {
    vi.resetModules();
    stubWorker();
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient, DatasetDuckDbCoordinator } =
      await importDuckDbModules();
    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_ID,
      owner: PUBLIC_OWNER,
    });

    await expect(
      DuckDbClient.runRawQuery(sql, {
        datasetTableReadMode: "public",
        publicSnapshotDuckDbOwner: PUBLIC_OWNER,
      }),
    ).resolves.toMatchObject({ data: [] });
  });

  // Workspace reads build and read case type views on purpose.
  it("still lets a workspace read name a case type's view", async () => {
    vi.resetModules();
    stubWorker();
    queryMock.mockResolvedValue({
      schema: { fields: [] },
      toArray: () => {
        return [];
      },
    });
    const { DuckDbClient } = await importDuckDbModules();

    await expect(
      DuckDbClient.runRawQuery(`SELECT * FROM "concept_${CONCEPT_ID}"`),
    ).resolves.toMatchObject({ data: [] });
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
