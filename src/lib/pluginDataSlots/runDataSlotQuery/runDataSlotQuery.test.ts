import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { runDataSlotQuery } =
  await import("@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;
const SQL = `SELECT "onset" AS "onsetDate"\nFROM "${DATASET_ID}"`;

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "onset",
  label: "onset",
  dataType: "date",
};

const DISTRICT_FIELD: DataSlotSourceField = {
  id: "col_district",
  columnName: "district",
  label: "district",
  dataType: "varchar",
};

const DATASET_SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

const RESULT: QueryResult.T = {
  id: "c6f1d1e2-3a4b-4c5d-8e6f-7a8b9c0d1e2f" as QueryResult.Id,
  columns: [{ name: "onsetDate", dataType: "date" }],
  data: [{ onsetDate: "2026-01-05" }],
  numRows: 1,
};

describe("runDataSlotQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runQueryMock.mockResolvedValue(RESULT);
  });

  it("returns the rows the workspace query session read", async () => {
    const result = await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
    });

    expect(result).toBe(RESULT);
    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ rawSql: SQL, workspaceId: WORKSPACE_ID }),
    );
  });

  it("passes the abort signal to the workspace query session", async () => {
    const { signal } = new AbortController();

    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
      signal,
    });

    expect(runQueryMock.mock.calls[0]![0].signal).toBe(signal);
  });

  it("loads only the given fields' columns of a dataset", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
      fields: [ONSET_FIELD],
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset"] },
      }),
    );
  });

  it("names a column once when two fields share it", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
      fields: [
        ONSET_FIELD,
        { ...DISTRICT_FIELD, id: "col_other" },
        ONSET_FIELD,
      ],
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset", "district"] },
      }),
    );
  });

  it("loads every field's column of a dataset when no fields are given", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset", "district"] },
      }),
    );
  });

  it("names no dataset columns for a case type, whose view plans its own", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: {
        kind: "concept",
        conceptId: "concept_cases" as Concept.Id,
        name: "Measles cases",
        fields: [ONSET_FIELD],
      },
      sql: SQL,
    });

    expect(runQueryMock.mock.calls[0]![0].neededColumnsByDatasetId).toBe(
      undefined,
    );
  });
});
