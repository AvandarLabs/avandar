/**
 * Integration tests for the Data Explorer state syncing contract.
 *
 * Confirms the top-down React-style data flow:
 *
 *   user action → reducer dispatch → state update → derived selectors
 *
 * In particular, when the SQL text or the query result columns change,
 * the reducer reconciles `vizConfig` (so the chart never references a
 * column that isn't there) and stores the current result columns so
 * cross-cutting consumers (chat panel, viz settings) see the same
 * source of truth.
 */
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { applyVizConfigFromQueryResult } from "$/models/vizs/applyVizConfigFromQueryResult/applyVizConfigFromQueryResult";
import { describe, expect, it } from "vitest";
import { INITIAL_DATA_EXPLORER_STATE } from "./DataExplorerAppState.types";
import type { DataExplorerAppState } from "./DataExplorerAppState.types";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";

function cols(
  pairs: ReadonlyArray<{
    name: string;
    dataType: QueryResultColumn["dataType"];
  }>,
): QueryResultColumn[] {
  return pairs.map((p) => {
    return { name: p.name, dataType: p.dataType };
  });
}

// We exercise the underlying reducer logic by importing the action
// implementation pieces. The DataExplorerStateManager itself wires these
// into a React context; testing the reducers directly keeps these tests
// fast and free of provider boilerplate.
function syncVizFromQueryResultReducer(
  state: DataExplorerAppState,
  columns: readonly QueryResultColumn[],
): DataExplorerAppState {
  const next = applyVizConfigFromQueryResult({
    vizConfig: state.vizConfig,
    rawSQL: state.rawSQL,
    query: state.query,
    columns,
  });
  return {
    ...state,
    vizConfig: next,
    lastResultColumns: columns,
  };
}

describe("Data Explorer state sync", () => {
  const initialBarConfig: BarChartVizConfig = {
    vizType: "bar",
    xAxisKey: "region",
    series: [{ renderAs: "bar", key: "count" }],
    layout: "group",
    withLegend: true,
  };

  it("preserves a same-named series across a re-query (the count bug)", () => {
    // User has a bar chart with `count` series. They re-run the query and
    // the result still has a `count` column (plus a new column). The bars
    // should not silently disappear.
    const startingState: DataExplorerAppState = {
      ...INITIAL_DATA_EXPLORER_STATE,
      query: StructuredQuery.makeEmpty(),
      rawSQL: "SELECT region, count FROM t",
      vizConfig: initialBarConfig,
    };

    const afterRequery = syncVizFromQueryResultReducer(
      startingState,
      cols([
        { name: "region", dataType: "varchar" },
        { name: "count", dataType: "bigint" },
        { name: "total", dataType: "double" },
      ]),
    );

    expect(afterRequery.vizConfig.vizType).toBe("bar");
    const bar = afterRequery.vizConfig as BarChartVizConfig;
    expect(
      bar.series.map((s) => {
        return s.key;
      }),
    ).toEqual(["count"]);
    expect(bar.xAxisKey).toBe("region");
  });

  it("drops series whose column disappears from the new result", () => {
    const startingState: DataExplorerAppState = {
      ...INITIAL_DATA_EXPLORER_STATE,
      rawSQL: "SELECT a, b FROM t",
      vizConfig: {
        vizType: "bar",
        xAxisKey: "a",
        series: [
          { renderAs: "bar", key: "b" },
          { renderAs: "bar", key: "gone" },
        ],
        layout: "group",
        withLegend: true,
      },
    };

    const afterRequery = syncVizFromQueryResultReducer(
      startingState,
      cols([
        { name: "a", dataType: "varchar" },
        { name: "b", dataType: "double" },
      ]),
    );

    const bar = afterRequery.vizConfig as BarChartVizConfig;
    expect(
      bar.series.map((s) => {
        return s.key;
      }),
    ).toEqual(["b"]);
  });

  it("records lastResultColumns so cross-cutting consumers see the live schema", () => {
    const startingState: DataExplorerAppState = {
      ...INITIAL_DATA_EXPLORER_STATE,
      vizConfig: initialBarConfig,
    };
    const columns = cols([
      { name: "region", dataType: "varchar" },
      { name: "count", dataType: "bigint" },
    ]);

    const next = syncVizFromQueryResultReducer(startingState, columns);
    expect(next.lastResultColumns).toEqual(columns);
  });

  it("survives a column rename via case-insensitive fallback", () => {
    // Old config has `Count` (the AI used PascalCase last time). The new
    // result returns `count`. The series should rebind, not be dropped.
    const startingState: DataExplorerAppState = {
      ...INITIAL_DATA_EXPLORER_STATE,
      vizConfig: {
        vizType: "bar",
        xAxisKey: "Region",
        series: [{ renderAs: "bar", key: "Count" }],
        layout: "group",
        withLegend: true,
      },
    };

    const afterRequery = syncVizFromQueryResultReducer(
      startingState,
      cols([
        { name: "region", dataType: "varchar" },
        { name: "count", dataType: "bigint" },
      ]),
    );

    const bar = afterRequery.vizConfig as BarChartVizConfig;
    expect(bar.xAxisKey).toBe("region");
    expect(
      bar.series.map((s) => {
        return s.key;
      }),
    ).toEqual(["count"]);
  });
});
