/**
 * Plugin charts all share the one `"plugin"` viz type, so the Data Explorer
 * remembers their configs in a separate map keyed by plugin chart type. These
 * tests drive the real `DataExplorerStateManager` through its `Provider` and
 * `useContext`, as the built-in memory tests do, so a break in the actual
 * action wiring is caught here.
 */
import { describe, expect, it } from "vitest";
import { makePluginVizMemoryKey } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const PLUGIN_ID = "avandar.epidemiology";

const EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" as QueryColumn.Id },
  settings: { interval: "epiWeek" },
};

const EDITED_EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  ...EPICURVE_CONFIG,
  settings: { interval: "day" },
};

const RATE_PLOT_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "rate-plot",
  columnSettings: { rateColumn: "rate" as QueryColumn.Id },
  settings: {},
};

const BAR_CONFIG: AvaBarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "onset" as QueryColumn.Id,
  series: [{ renderAs: "bar", key: "cases" as QueryColumn.Id }],
  layout: "stack",
  withLegend: false,
};

const SQL_COLUMN_ID = "sql-onset" as QueryColumn.Id;
const STRUCTURED_COLUMN_ID = "structured-onset" as QueryColumn.Id;

const PROVISIONAL_BINDINGS: QueryResultColumnBindingRegistry = {
  version: 1,
  scopeKey: "explorer",
  sqlKey: "select onset from cases",
  columns: [
    {
      id: SQL_COLUMN_ID,
      name: "onset",
      dataType: "date",
      expressionKey: "physical",
      sqlExpressionKey: "physical",
    },
  ],
};

const STRUCTURED_BINDINGS: QueryResultColumnBindingRegistry = {
  ...PROVISIONAL_BINDINGS,
  columns: [
    {
      ...PROVISIONAL_BINDINGS.columns[0]!,
      id: STRUCTURED_COLUMN_ID,
      expressionKey: "model",
    },
  ],
};

const UI_EPICURVE_CONFIG: UiVizConfig = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" },
  settings: { interval: "month" },
};

const ONSET_COLUMN: QueryResult.ColumnWithId = {
  id: "onset" as QueryColumn.Id,
  name: "onset",
  dataType: "date",
};

const REPORT_COLUMN: QueryResult.ColumnWithId = {
  id: "report" as QueryColumn.Id,
  name: "report",
  dataType: "date",
};

/** The epicurve config the picker builds once onset leaves the result. */
const FRESH_EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  ...EPICURVE_CONFIG,
  columnSettings: { dateColumn: REPORT_COLUMN.id },
};

function _Wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager(): RenderHookResult<
  ReturnType<typeof DataExplorerStateManager.useContext>,
  unknown
> {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    { wrapper: _Wrapper },
  );
}

/**
 * Runs a result with `columns`, then edits an epicurve on the onset column
 * and switches to a bar chart, so the epicurve is remembered.
 */
function _rememberEditedEpicurve(
  result: { current: ReturnType<typeof DataExplorerStateManager.useContext> },
  columns: readonly QueryResult.ColumnWithId[],
): void {
  act(() => {
    result.current[1].syncVizFromQueryResult(columns);
  });
  act(() => {
    result.current[1].setActiveVizType(EPICURVE_CONFIG);
  });
  act(() => {
    result.current[1].setVizConfig(EDITED_EPICURVE_CONFIG);
  });
  act(() => {
    result.current[1].setActiveVizType("bar");
  });
}

function _getActivePluginConfig(result: {
  current: ReturnType<typeof DataExplorerStateManager.useContext>;
}): AvaVizConfig.Plugin | undefined {
  const { vizConfig } = result.current[0];
  return vizConfig.vizType === "plugin" ? vizConfig : undefined;
}

describe("Data Explorer plugin viz config memory", () => {
  it("activates the plugin config passed to setActiveVizType", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual(EPICURVE_CONFIG);
  });

  it("restores a plugin chart's edited settings after a round trip through a bar chart", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setVizConfig(EDITED_EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType("bar");
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual(EDITED_EPICURVE_CONFIG);
  });

  it("restores each plugin chart's own config when switching between two charts of one plugin", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setVizConfig(EDITED_EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(RATE_PLOT_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual(EDITED_EPICURVE_CONFIG);
  });

  it("keeps the outgoing built-in config in the viz type memory when a plugin chart is activated", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfigMemory.bar).toStrictEqual(BAR_CONFIG);
  });

  it("ignores a switch to the plugin chart type already active", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });
    const stateBeforeReselection = result.current[0];

    act(() => {
      result.current[1].setActiveVizType({ ...EPICURVE_CONFIG, settings: {} });
    });

    expect(result.current[0]).toBe(stateBeforeReselection);
  });

  it("remaps provisional column IDs inside a remembered plugin config", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setColumnBindings(PROVISIONAL_BINDINGS);
    });
    act(() => {
      result.current[1].setActiveVizType({
        ...EPICURVE_CONFIG,
        columnSettings: { dateColumn: SQL_COLUMN_ID },
      });
    });
    act(() => {
      result.current[1].setActiveVizType("table");
    });
    act(() => {
      result.current[1].setColumnBindings(STRUCTURED_BINDINGS);
    });

    expect(
      result.current[0].pluginVizConfigMemory[
        makePluginVizMemoryKey(EPICURVE_CONFIG)
      ]?.columnSettings,
    ).toStrictEqual({ dateColumn: STRUCTURED_COLUMN_ID });
  });

  it("keeps a remembered column setting whose column is still in the result", () => {
    const { result } = _renderStateManager();
    _rememberEditedEpicurve(result, [ONSET_COLUMN, REPORT_COLUMN]);

    act(() => {
      result.current[1].setActiveVizType(FRESH_EPICURVE_CONFIG);
    });

    expect(_getActivePluginConfig(result)?.columnSettings).toStrictEqual({
      dateColumn: ONSET_COLUMN.id,
    });
  });

  it("takes the fresh config's column setting when the remembered column left the result", () => {
    const { result } = _renderStateManager();
    _rememberEditedEpicurve(result, [ONSET_COLUMN, REPORT_COLUMN]);
    act(() => {
      result.current[1].syncVizFromQueryResult([REPORT_COLUMN]);
    });

    act(() => {
      result.current[1].setActiveVizType(FRESH_EPICURVE_CONFIG);
    });

    expect(_getActivePluginConfig(result)?.columnSettings).toStrictEqual({
      dateColumn: REPORT_COLUMN.id,
    });
  });

  it("keeps remembered non-column settings when a column setting is replaced", () => {
    const { result } = _renderStateManager();
    _rememberEditedEpicurve(result, [ONSET_COLUMN, REPORT_COLUMN]);
    act(() => {
      result.current[1].syncVizFromQueryResult([REPORT_COLUMN]);
    });

    act(() => {
      result.current[1].setActiveVizType(FRESH_EPICURVE_CONFIG);
    });

    expect(_getActivePluginConfig(result)?.settings).toStrictEqual(
      EDITED_EPICURVE_CONFIG.settings,
    );
  });

  it("keeps a remembered column setting while no result has columns", () => {
    const { result } = _renderStateManager();
    _rememberEditedEpicurve(result, [ONSET_COLUMN]);
    act(() => {
      result.current[1].setRawSql("select report from cases");
    });

    act(() => {
      result.current[1].setActiveVizType(FRESH_EPICURVE_CONFIG);
    });

    expect(_getActivePluginConfig(result)?.columnSettings).toStrictEqual({
      dateColumn: ONSET_COLUMN.id,
    });
  });

  it("shows a plugin chart restored from the URL without column settings until a result binds it", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].restoreVizConfigFromUrl(UI_EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual({
      ...UI_EPICURVE_CONFIG,
      columnSettings: {},
    });
  });
});
