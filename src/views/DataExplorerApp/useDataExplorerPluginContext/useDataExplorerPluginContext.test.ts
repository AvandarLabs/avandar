import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_LIVE_QUERY_HANDLES,
  QueryHandleRegistry,
} from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import { renderHook } from "@/test-utils";
import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";
import type { QueryHandle } from "@avandar/plugin-sdk";
import type { RenderHookResult } from "@testing-library/react";

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

/**
 * Fills the registry to its live limit with other results, so registering one
 * more handle evicts the oldest of them and a test can count registrations by
 * how many of these stop being readable.
 */
function _fillRegistryWithOtherResults(): QueryHandle[] {
  return Array.from({ length: MAX_LIVE_QUERY_HANDLES }, (_unused, index) => {
    return QueryHandleRegistry.getOrCreate([{ other: index }]);
  });
}

function _countReadableHandles(handles: readonly QueryHandle[]): number {
  return handles.filter((handle) => {
    return QueryHandleRegistry.getRows(handle) !== undefined;
  }).length;
}

function _renderWithSettledResult(): RenderHookResult<
  ReturnType<typeof useDataExplorerPluginContext>,
  unknown
> {
  return renderHook(() => {
    return useDataExplorerPluginContext({
      queryResults: QUERY_RESULTS,
      isLoadingResults: false,
    });
  });
}

describe("useDataExplorerPluginContext", () => {
  beforeEach(() => {
    QueryHandleRegistry.clear();
  });

  it("has no context getter and empty facts while there is no result", () => {
    const { result } = renderHook(() => {
      return useDataExplorerPluginContext({
        queryResults: undefined,
        isLoadingResults: false,
      });
    });

    expect(result.current.getContext).toBeUndefined();
    expect(result.current.facts).toMatchObject({
      hasResult: false,
      rowCount: 0,
    });
  });

  it("has no context getter while the results are loading", () => {
    const { result } = renderHook(() => {
      return useDataExplorerPluginContext({
        queryResults: QUERY_RESULTS,
        isLoadingResults: true,
      });
    });

    expect(result.current.getContext).toBeUndefined();
    expect(result.current.facts).toMatchObject({ hasResult: false });
  });

  it("builds the toolbar context and facts from a settled result", () => {
    const { result } = _renderWithSettledResult();

    const { getContext, facts } = result.current;
    const context = getContext!();
    expect(context).toMatchObject({
      slotId: "dataExplorer.toolbar",
      rowCount: 2,
      columns: [
        { name: "cases", dataType: "bigint" },
        { name: "onset", dataType: "date" },
      ],
    });
    expect(QueryHandleRegistry.getRows(context.queryHandle)).toBe(
      QUERY_RESULTS.data,
    );
    expect(facts).toMatchObject({
      hasResult: true,
      rowCount: 2,
      numericColumnCount: 1,
      dateColumnCount: 1,
    });
  });

  it("registers no query handle when a result settles", () => {
    const otherHandles = _fillRegistryWithOtherResults();

    _renderWithSettledResult();

    expect(_countReadableHandles(otherHandles)).toBe(MAX_LIVE_QUERY_HANDLES);
  });

  it("registers one query handle however often the context is built", () => {
    const { result } = _renderWithSettledResult();
    const otherHandles = _fillRegistryWithOtherResults();

    result.current.getContext!();
    result.current.getContext!();

    expect(_countReadableHandles(otherHandles)).toBe(
      MAX_LIVE_QUERY_HANDLES - 1,
    );
  });

  it("keeps the same getter and facts across rerenders of one result", () => {
    const { result, rerender } = _renderWithSettledResult();
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(result.current.getContext).toBe(first.getContext);
    expect(result.current.facts).toBe(first.facts);
  });
});
