import { beforeEach, describe, expect, it } from "vitest";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
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

type RunState = { isLoadingResults: boolean; hasResults: boolean };

const SETTLED_RUN_STATE: RunState = {
  isLoadingResults: false,
  hasResults: true,
};

/**
 * Renders the hook on a settled result, so a test can rerender it with the
 * `RunState` of a later run.
 */
function _renderWithRunStates(): RenderHookResult<
  ReturnType<typeof useDataExplorerPluginContext>,
  RunState
> {
  return renderHook(
    (runState: RunState) => {
      return useDataExplorerPluginContext({
        queryResults: runState.hasResults ? QUERY_RESULTS : undefined,
        isLoadingResults: runState.isLoadingResults,
      });
    },
    { initialProps: SETTLED_RUN_STATE },
  );
}

describe("useDataExplorerPluginContext", () => {
  beforeEach(() => {
    QueryHandleRegistry.clear();
    ExplorerPluginResultStore.clear();
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

  it("keeps the last settled facts while a new run is loading", () => {
    const { result, rerender } = _renderWithRunStates();
    const settledFacts = result.current.facts;

    rerender({ isLoadingResults: true, hasResults: false });

    expect(result.current.getContext).toBeUndefined();
    expect(result.current.facts).toBe(settledFacts);
    expect(result.current.facts).toMatchObject({
      hasResult: true,
      rowCount: 2,
      numericColumnCount: 1,
    });
  });

  it("clears the facts when a run settles with no result", () => {
    const { result, rerender } = _renderWithRunStates();

    rerender({ isLoadingResults: true, hasResults: false });
    rerender({ isLoadingResults: false, hasResults: false });

    expect(result.current.facts).toMatchObject({
      hasResult: false,
      rowCount: 0,
    });
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

  it("publishes the settled result's columns and rows to the store", () => {
    _renderWithSettledResult();

    expect(ExplorerPluginResultStore.get()).toEqual({
      columns: [
        { name: "cases", dataType: "bigint" },
        { name: "onset", dataType: "date" },
      ],
      rows: QUERY_RESULTS.data,
    });
  });

  it("clears the store when the hook unmounts", () => {
    const { unmount } = _renderWithSettledResult();

    unmount();

    expect(ExplorerPluginResultStore.get()).toBeUndefined();
  });

  it("keeps the last settled result in the store while a run loads", () => {
    const { rerender } = _renderWithRunStates();

    rerender({ isLoadingResults: true, hasResults: false });

    expect(ExplorerPluginResultStore.get()?.rows).toBe(QUERY_RESULTS.data);
  });

  it("clears the store when a run settles with no result", () => {
    const { rerender } = _renderWithRunStates();

    rerender({ isLoadingResults: true, hasResults: false });
    rerender({ isLoadingResults: false, hasResults: false });

    expect(ExplorerPluginResultStore.get()).toBeUndefined();
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
