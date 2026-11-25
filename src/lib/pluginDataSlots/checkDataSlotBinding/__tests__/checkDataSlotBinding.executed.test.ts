import { beforeEach, describe, expect, it, vi } from "vitest";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { DuckDBConnection } from "@duckdb/node-api";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { checkDataSlotBinding } =
  await import("@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;

/** Two attribute keys that differ only by case, which DuckDB treats as one. */
const CASE_COLLIDING_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    Foo: { type: "text", title: "%slot.cases.upper%", required: false },
    foo: { type: "text", title: "%slot.cases.lower%", required: false },
  },
};

const MOSTLY_FILLED_FIELD: DataSlotSourceField = {
  id: "col_p",
  columnName: "p",
  label: "p",
  dataType: "varchar",
};

const MOSTLY_EMPTY_FIELD: DataSlotSourceField = {
  id: "col_q",
  columnName: "q",
  label: "q",
  dataType: "varchar",
};

const SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [MOSTLY_FILLED_FIELD, MOSTLY_EMPTY_FIELD],
};

async function _createDatasetTable(
  connection: DuckDBConnection,
): Promise<void> {
  await connection.run(`
    CREATE TABLE "${DATASET_ID}" AS
    SELECT * FROM (VALUES
      ('a', NULL),
      ('b', NULL),
      ('c', 'x'),
      ('d', NULL)
    ) AS cases(p, q)
  `);
}

describe("checkDataSlotBinding in DuckDB", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts each attribute's own column when keys differ only by case", async () => {
    const result = await withDuckDb(async (connection) => {
      await _createDatasetTable(connection);
      runQueryMock.mockImplementation(async (params: { rawSql: string }) => {
        const reader = await connection.runAndReadAll(params.rawSql);
        return { data: reader.getRowObjects() };
      });

      return await checkDataSlotBinding({
        workspaceId: WORKSPACE_ID,
        slot: CASE_COLLIDING_SLOT,
        source: SOURCE,
        fieldsByAttributeKey: {
          Foo: MOSTLY_FILLED_FIELD,
          foo: MOSTLY_EMPTY_FIELD,
        },
      });
    });

    expect(result.rowCount).toBe(4);
    expect(result.filledCountsByAttributeKey).toEqual({ Foo: 4, foo: 1 });
  });
});
