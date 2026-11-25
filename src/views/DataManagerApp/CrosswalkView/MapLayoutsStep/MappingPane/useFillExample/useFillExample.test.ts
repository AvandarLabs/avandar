import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { buildCodeListLookups } from "@/lib/crosswalks/buildCodeListLookups/buildCodeListLookups";
import { renderHook, waitFor } from "@/test-utils";
import {
  CONTEXT,
  GENDER_FILL,
  ONSET_COLUMN,
  QUEENS_MARCH_ID,
  SEX_COLUMN,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import {
  buildFillExampleSql,
  useFillExample,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample";
import type { Workspace } from "$/models/Workspace/Workspace";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const LOOKUPS = buildCodeListLookups(CONTEXT.entriesById);
const BASE = {
  workspaceId: "workspace-1" as Workspace.Id,
  datasetId: QUEENS_MARCH_ID,
  codesOutputAs: "labels" as const,
  columnNames: ["CaseNo", "GENDER", "onset_dt", "age_mo"],
  ...LOOKUPS,
};

describe("buildFillExampleSql", () => {
  it("reads three distinct values beside exactly the combined dataset's SQL for them", () => {
    const fill = {
      kind: "column" as const,
      sourceColumn: "onset_dt",
      convert: { kind: "parse_date" as const, format: "%m/%d/%Y" },
      codeListId: undefined,
      holdsLabels: false,
    };
    const afterSql = CrosswalkSql.toFillSql({
      fill,
      column: ONSET_COLUMN,
      codesOutputAs: "labels",
      ...LOOKUPS,
    });

    expect(buildFillExampleSql({ ...BASE, fill, column: ONSET_COLUMN })).toBe(
      `SELECT DISTINCT CAST("onset_dt" AS VARCHAR) AS "before", CAST(${afterSql} AS VARCHAR) AS "after" ` +
        `FROM "${QUEENS_MARCH_ID}" WHERE CAST("onset_dt" AS VARCHAR) IS NOT NULL ` +
        `AND CAST("onset_dt" AS VARCHAR) <> '' LIMIT 3`,
    );
  });

  it("joins a Combine formula's columns for the before value", () => {
    const sql = buildFillExampleSql({
      ...BASE,
      fill: { kind: "expression", sql: "concat({CaseNo}, '-', {age_mo})" },
      column: ONSET_COLUMN,
    });

    expect(sql).toContain(
      `SELECT DISTINCT concat_ws(', ', CAST("CaseNo" AS VARCHAR), CAST("age_mo" AS VARCHAR)) AS "before"`,
    );
  });

  it("has no example for a fixed value, an empty fill, or an invalid formula", () => {
    const column = ONSET_COLUMN;
    expect(
      buildFillExampleSql({
        ...BASE,
        column,
        fill: { kind: "constant", value: "x" },
      }),
    ).toBeUndefined();
    expect(
      buildFillExampleSql({ ...BASE, column, fill: { kind: "empty" } }),
    ).toBeUndefined();
    expect(
      buildFillExampleSql({
        ...BASE,
        column,
        fill: { kind: "expression", sql: "{nope}" },
      }),
    ).toBeUndefined();
    expect(
      buildFillExampleSql({ ...BASE, column, fill: undefined }),
    ).toBeUndefined();
  });
});

describe("useFillExample", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("reads the rows and says which values become empty", async () => {
    runQueryMock.mockResolvedValue({
      data: [
        { before: "1", after: "Male" },
        { before: "7", after: null },
      ],
    });
    const { result } = renderHook(() => {
      return useFillExample({ ...BASE, fill: GENDER_FILL, column: SEX_COLUMN });
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "ready",
        result: [
          { before: "1", after: "Male" },
          { before: "7", after: undefined },
        ],
      });
    });
    expect(runQueryMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      rawSql: expect.stringContaining(`FROM "${QUEENS_MARCH_ID}"`),
    });
  });

  it("reads nothing for a fill with no example", () => {
    const { result } = renderHook(() => {
      return useFillExample({
        ...BASE,
        fill: { kind: "empty" },
        column: SEX_COLUMN,
      });
    });

    expect(result.current).toBeUndefined();
    expect(runQueryMock).not.toHaveBeenCalled();
  });
});
