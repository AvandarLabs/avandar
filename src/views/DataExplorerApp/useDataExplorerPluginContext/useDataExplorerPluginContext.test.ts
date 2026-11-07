import { describe, expect, it } from "vitest";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { renderHook } from "@/test-utils";
import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";

const QUERY_RESULTS = {
  columns: [
    { name: "cases", dataType: "bigint" },
    { name: "onset", dataType: "date" },
  ],
  data: [
    { cases: 3, onset: "2026-01-01" },
    { cases: 5, onset: "2026-01-02" },
  ],
} as const;

describe("useDataExplorerPluginContext", () => {
  it("has no context and empty facts while there is no result", () => {
    const { result } = renderHook(() => {
      return useDataExplorerPluginContext({
        queryResults: undefined,
        isLoadingResults: false,
      });
    });

    expect(result.current.context).toBeUndefined();
    expect(result.current.facts).toMatchObject({
      hasResult: false,
      rowCount: 0,
    });
  });

  it("has no context while the results are loading", () => {
    const { result } = renderHook(() => {
      return useDataExplorerPluginContext({
        queryResults: QUERY_RESULTS,
        isLoadingResults: true,
      });
    });

    expect(result.current.context).toBeUndefined();
    expect(result.current.facts).toMatchObject({ hasResult: false });
  });

  it("builds the toolbar context and facts from a settled result", () => {
    const { result } = renderHook(() => {
      return useDataExplorerPluginContext({
        queryResults: QUERY_RESULTS,
        isLoadingResults: false,
      });
    });

    const { context, facts } = result.current;
    expect(context).toMatchObject({
      slotId: "dataExplorer.toolbar",
      rowCount: 2,
      columns: [
        { name: "cases", dataType: "bigint" },
        { name: "onset", dataType: "date" },
      ],
    });
    expect(QueryHandleRegistry.getRows(context!.queryHandle)).toBe(
      QUERY_RESULTS.data,
    );
    expect(facts).toMatchObject({
      hasResult: true,
      rowCount: 2,
      numericColumnCount: 1,
      dateColumnCount: 1,
    });
  });

  it("keeps the same context and facts across rerenders of one result", () => {
    const { result, rerender } = renderHook(() => {
      return useDataExplorerPluginContext({
        queryResults: QUERY_RESULTS,
        isLoadingResults: false,
      });
    });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(result.current.context).toBe(first.context);
    expect(result.current.facts).toBe(first.facts);
  });
});
