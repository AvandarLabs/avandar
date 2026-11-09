import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
/** Execution identity gates publication without clearing loading state. */
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";

type UseQueryResultColumnBindingsOptions = Parameters<
  typeof useQueryResultColumnBindings
>[0];
const SQL_A = "SELECT revenue AS total FROM sales";
const SQL_B = "SELECT revenue AS amount FROM sales";
function _options({
  sqlKey = SQL_A,
  name = "total",
}: {
  sqlKey?: string;
  name?: string;
} = {}): UseQueryResultColumnBindingsOptions {
  const result = {
    ...QueryResult.makeEmpty(),
    columns: [{ name, dataType: "double" as const }],
    data: [{ [name]: 7 }],
    numRows: 1,
  };
  return {
    scopeKey: "owner",
    sqlKey,
    resultSqlKey: sqlKey,
    result,
    projections: makeProjectionDescriptorsFromSql({
      sql: sqlKey,
      columns: result.columns,
    }),
    initialRegistry: undefined,
  };
}
const BASE_SQL = `SELECT "borough", "cases" FROM "nyc"`;
const WRAPPED_SQL = [
  "WITH ava_source AS (",
  "  SELECT *, row_number() OVER () AS __ava_row FROM (",
  BASE_SQL,
  "  )",
  ")",
  "SELECT * EXCLUDE (__ava_row),",
  `  ("cases" * 2) AS "double_cases"`,
  "FROM ava_source",
  "ORDER BY __ava_row",
].join("\n");

function _optionsFromSql(
  sql: string,
  columnNames: readonly string[],
): UseQueryResultColumnBindingsOptions {
  const columns = columnNames.map((name) => {
    return { name, dataType: "bigint" as const };
  });
  return {
    scopeKey: "owner",
    sqlKey: sql,
    resultSqlKey: sql,
    result: { ...QueryResult.makeEmpty(), columns, data: [], numRows: 0 },
    projections: makeProjectionDescriptorsFromSql({ sql, columns }),
    initialRegistry: undefined,
  };
}

describe("useQueryResultColumnBindings", () => {
  it("does not create a schema from an absent result", () => {
    const { result } = renderHook(() => {
      return useQueryResultColumnBindings({ ..._options(), result: undefined });
    });
    expect(result.current).toBeUndefined();
  });
  it("distinguishes a completed result with no QueryResult columns from loading", () => {
    const { result } = renderHook(() => {
      return useQueryResultColumnBindings({
        ..._options(),
        result: QueryResult.makeEmpty(),
        projections: [],
      });
    });
    expect(result.current?.columns).toEqual([]);
  });
  it("retains bindings during loading and identical completed refetches", () => {
    const options = _options();
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: options,
    });
    const bound = result.current;
    expect(bound?.columns[0]?.name).toBe("total");
    rerender({ ...options, result: undefined, resultSqlKey: undefined });
    expect(result.current).toBe(bound);
    rerender(_options());
    expect(result.current).toBe(bound);
  });
  it("never publishes a late result from A after the owner switches to B", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _options(),
    });
    const savedId = result.current?.columns[0]?.id;
    rerender({ ..._options(), sqlKey: SQL_B });
    expect(result.current).toBeUndefined();
    rerender(_options({ sqlKey: SQL_B, name: "amount" }));
    expect(result.current?.columns[0]).toMatchObject({
      id: savedId,
      name: "amount",
    });
  });
  it("does not expose a completed schema from a different owner scope", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _options(),
    });
    const savedId = result.current?.columns[0]?.id;
    rerender({ ..._options(), scopeKey: "other", result: undefined });
    expect(result.current).toBeUndefined();
    rerender({ ..._options(), scopeKey: "other" });
    expect(result.current?.columns[0]?.id).not.toBe(savedId);
  });
  it("restores persisted target identity without mutating raw results", () => {
    const options = _options();
    const { result } = renderHook(useQueryResultColumnBindings, {
      initialProps: options,
    });
    const registry = result.current?.registry;
    const restored = renderHook(useQueryResultColumnBindings, {
      initialProps: { ..._options(), initialRegistry: registry },
    });
    expect(restored.result.current?.columns[0]?.id).toBe(
      registry?.columns[0]?.id,
    );
    expect(options.result?.columns).toEqual([
      { name: "total", dataType: "double" },
    ]);
    expect(options.result?.data).toEqual([{ total: 7 }]);
  });
  it("keeps pass-through column IDs when seeded with bindings re-keyed to wrapped SQL", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _optionsFromSql(BASE_SQL, ["borough", "cases"]),
    });
    const baseRegistry = result.current?.registry;
    const [boroughId, casesId] = (result.current?.columns ?? []).map(
      (column) => {
        return column.id;
      },
    );

    rerender({
      ..._optionsFromSql(WRAPPED_SQL, ["borough", "cases", "double_cases"]),
      initialRegistry: baseRegistry && { ...baseRegistry, sqlKey: WRAPPED_SQL },
    });

    const wrappedIds = result.current?.columns.map((column) => {
      return column.id;
    });
    expect(wrappedIds?.slice(0, 2)).toEqual([boroughId, casesId]);
  });

  it("gives a column the wrapped SQL adds an ID of its own", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _optionsFromSql(BASE_SQL, ["borough", "cases"]),
    });
    const baseRegistry = result.current?.registry;
    const baseIds = (result.current?.columns ?? []).map((column) => {
      return column.id;
    });

    rerender({
      ..._optionsFromSql(WRAPPED_SQL, ["borough", "cases", "double_cases"]),
      initialRegistry: baseRegistry && { ...baseRegistry, sqlKey: WRAPPED_SQL },
    });

    const addedId = result.current?.columns[2]?.id;
    expect(addedId).toBeDefined();
    expect(baseIds).not.toContain(addedId);
  });

  it("gives wrapped SQL fresh IDs when the seed is keyed to other SQL", () => {
    const { result, rerender } = renderHook(useQueryResultColumnBindings, {
      initialProps: _optionsFromSql(BASE_SQL, ["borough", "cases"]),
    });
    const baseRegistry = result.current?.registry;
    const boroughId = result.current?.columns[0]?.id;

    rerender({
      ..._optionsFromSql(WRAPPED_SQL, ["borough", "cases", "double_cases"]),
      initialRegistry: baseRegistry,
    });

    expect(result.current?.columns[0]?.id).not.toBe(boroughId);
  });
});
