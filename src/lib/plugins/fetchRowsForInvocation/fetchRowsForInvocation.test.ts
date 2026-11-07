import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FETCH_ROWS_LIMIT,
  fetchRowsForInvocation,
  MAX_FETCH_ROWS_LIMIT,
} from "@/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { QueryHandle } from "@avandar/plugin-sdk";

const ROWS = [
  { x: 1, y: 3, label: "a" },
  { x: 2, y: 5, label: "b" },
  { x: 3, y: 7, label: "c" },
];

function _makeNumberedRows(rowCount: number): Array<{ x: number }> {
  return Array.from({ length: rowCount }, (_unused, index) => {
    return { x: index };
  });
}

function _fetchRowsFromRows(options: {
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  limit?: number;
}) {
  const handle = QueryHandleRegistry.getOrCreate(options.rows);
  return fetchRowsForInvocation({
    invocationHandle: handle,
    queryHandle: handle,
    columns: ["x"],
    limit: options.limit,
  });
}

function _getPluginErrorCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginError);
    return (error as PluginError).code;
  }
  return undefined;
}

describe("fetchRowsForInvocation", () => {
  it("projects the requested columns", () => {
    const result = fetchRowsForInvocation({
      invocationHandle: QueryHandleRegistry.getOrCreate(ROWS),
      queryHandle: QueryHandleRegistry.getOrCreate(ROWS),
      columns: ["x", "y"],
    });

    expect(result.rows).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);
    expect(result.isTruncated).toBe(false);
  });

  it("returns only the first rows up to the limit", () => {
    const result = _fetchRowsFromRows({ rows: ROWS, limit: 2 });

    expect(result.rows).toEqual([{ x: 1 }, { x: 2 }]);
  });

  it("reports truncation when the limit cuts rows off", () => {
    const result = _fetchRowsFromRows({ rows: ROWS, limit: 2 });

    expect(result.isTruncated).toBe(true);
  });

  it("returns at most the default limit when none is given", () => {
    const rows = _makeNumberedRows(DEFAULT_FETCH_ROWS_LIMIT + 1);

    const result = _fetchRowsFromRows({ rows });

    expect(result.rows).toHaveLength(DEFAULT_FETCH_ROWS_LIMIT);
    expect(result.isTruncated).toBe(true);
  });

  it("clamps a limit above the maximum to the maximum", () => {
    const rows = _makeNumberedRows(MAX_FETCH_ROWS_LIMIT + 1);

    const result = _fetchRowsFromRows({
      rows,
      limit: MAX_FETCH_ROWS_LIMIT * 10,
    });

    expect(result.rows).toHaveLength(MAX_FETCH_ROWS_LIMIT);
    expect(result.isTruncated).toBe(true);
  });

  it("clamps a limit below one to one row", () => {
    const result = _fetchRowsFromRows({ rows: ROWS, limit: 0 });

    expect(result.rows).toEqual([{ x: 1 }]);
  });

  it("rejects a handle from another invocation", () => {
    const invocationHandle = QueryHandleRegistry.getOrCreate(ROWS);
    const otherHandle = QueryHandleRegistry.getOrCreate([{ x: 9 }]);

    const code = _getPluginErrorCode(() => {
      return fetchRowsForInvocation({
        invocationHandle,
        queryHandle: otherHandle,
        columns: ["x"],
      });
    });

    expect(code).toBe("PermissionDenied");
  });

  it("rejects the invocation handle when its rows are no longer held", () => {
    const unknownHandle = "never-registered" as QueryHandle;

    const code = _getPluginErrorCode(() => {
      return fetchRowsForInvocation({
        invocationHandle: unknownHandle,
        queryHandle: unknownHandle,
        columns: ["x"],
      });
    });

    expect(code).toBe("InvalidHandle");
  });
});
