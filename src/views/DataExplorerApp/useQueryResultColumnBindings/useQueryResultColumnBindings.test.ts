import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
/** Execution identity gates publication without clearing loading state. */
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";

type Options = Parameters<typeof useQueryResultColumnBindings>[0];
const SQL_A = "SELECT revenue AS total FROM sales";
const SQL_B = "SELECT revenue AS amount FROM sales";
function _options({
  sqlKey = SQL_A,
  name = "total",
}: {
  sqlKey?: string;
  name?: string;
} = {}): Options {
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
});
