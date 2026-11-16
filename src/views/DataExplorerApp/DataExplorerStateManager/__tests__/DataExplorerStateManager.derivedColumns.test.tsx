/**
 * A plugin command that adds derived columns puts wrapped SQL in the
 * explorer, and its Undo puts back what was there before. This drives the real
 * `DataExplorerStateManager` through its `Provider` and `useContext`, so the
 * action wiring is covered too.
 */
import { normalizeSqlForSubquery } from "@avandar/utils/sql";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { makeDerivedColumnsSnapshotFromState } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const BASE_SQL = `SELECT "borough", "cases" FROM "nyc";`;

const WRAPPED_SQL = [
  "WITH ava_source AS (",
  "  SELECT *, row_number() OVER () AS __ava_row FROM (",
  `SELECT "borough", "cases" FROM "nyc"`,
  "  )",
  ")",
  "SELECT * EXCLUDE (__ava_row),",
  `  ("cases" * 2) AS "double_cases"`,
  "FROM ava_source",
  "ORDER BY __ava_row",
].join("\n");

const BOROUGH_ID = "borough-id" as QueryColumn.Id;
const CASES_ID = "cases-id" as QueryColumn.Id;

const BAR_CONFIG: AvaVizConfig.T = {
  vizType: "bar",
  xAxisKey: BOROUGH_ID,
  series: [{ renderAs: "bar", key: CASES_ID }],
  layout: "group",
  withLegend: true,
};

const BINDINGS: QueryResultColumnBindingRegistry = {
  version: 1,
  scopeKey: "scope",
  sqlKey: normalizeSqlForSubquery(BASE_SQL),
  columns: [
    { id: BOROUGH_ID, name: "borough", dataType: "varchar" },
    { id: CASES_ID, name: "cases", dataType: "bigint" },
  ],
};

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

/**
 * Renders the state manager with raw SQL, a bar chart, column bindings for
 * that SQL, a prompt, and a last result, as after a chat-generated query ran.
 */
function _renderStateManagerWithResult(): RenderHookResult<
  ReturnType<typeof DataExplorerStateManager.useContext>,
  unknown
> {
  const rendered = renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    { wrapper: _wrapper },
  );
  act(() => {
    const dispatch = rendered.result.current[1];
    dispatch.setQueryTrigger("chat_generated");
    dispatch.setRawSql(BASE_SQL);
    dispatch.setNlPrompt("cases by borough");
    dispatch.setVizConfig(BAR_CONFIG);
    dispatch.setColumnBindings(BINDINGS);
    dispatch.syncVizFromQueryResult(BINDINGS.columns);
  });
  return rendered;
}

describe("Data Explorer derived columns", () => {
  it("puts the derived columns SQL in the explorer", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].rawSql).toBe(WRAPPED_SQL);
  });

  it("stamps the run as a plugin command", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].queryTrigger).toBe("plugin_command");
  });

  it("marks the structured query out of sync with the SQL", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].isStructuredQueryInSync).toBe(false);
  });

  it("clears the last result, the URL chart, and the prompt", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].lastResultColumns).toBeUndefined();
    expect(result.current[0].pendingUrlVizConfig).toBeUndefined();
    expect(result.current[0].nlPrompt).toBeUndefined();
  });

  it("keeps the chart config", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].vizConfig).toEqual(BAR_CONFIG);
  });

  it("re-keys the column bindings to the derived columns SQL", () => {
    const { result } = _renderStateManagerWithResult();

    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });

    expect(result.current[0].columnBindings).toEqual({
      ...BINDINGS,
      sqlKey: normalizeSqlForSubquery(WRAPPED_SQL),
    });
  });

  it("restores the SQL, chart, bindings, and prompt from a snapshot", () => {
    const { result } = _renderStateManagerWithResult();
    const snapshot = makeDerivedColumnsSnapshotFromState(result.current[0]);
    act(() => {
      result.current[1].applyDerivedColumnsSql(WRAPPED_SQL);
    });
    act(() => {
      result.current[1].setVizConfig({ vizType: "table" });
    });

    act(() => {
      result.current[1].restoreDerivedColumnsSnapshot(snapshot);
    });

    expect(result.current[0]).toMatchObject({
      rawSql: BASE_SQL,
      vizConfig: BAR_CONFIG,
      columnBindings: BINDINGS,
      nlPrompt: "cases by borough",
      queryTrigger: "plugin_command",
      lastResultColumns: undefined,
    });
  });
});
