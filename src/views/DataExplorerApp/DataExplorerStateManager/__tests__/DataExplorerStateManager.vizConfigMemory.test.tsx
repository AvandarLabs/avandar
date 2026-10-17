/**
 * `convertVizConfig` is a lossy projection by design: a pie config has no
 * axes or grid, so converting bar -> pie -> bar cannot recover the bar
 * chart's styling on its own. The state manager keeps a per-viz-type memory
 * so the round trip survives.
 *
 * This drives the real `DataExplorerStateManager` through its `Provider` and
 * `useContext`, rather than re-implementing the reducer locally the way
 * `DataExplorerStateManager.test.ts` does, so a break in the actual action
 * wiring is caught here.
 */
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const COLUMNS: readonly QueryResult.BoundColumn[] = [
  { id: "quarter" as QueryColumn.Id, name: "quarter", dataType: "varchar" },
  { id: "revenue" as QueryColumn.Id, name: "revenue", dataType: "double" },
];

const STYLED_BAR_CONFIG: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "quarter" as QueryColumn.Id,
  series: [{ renderAs: "bar", key: "revenue" as QueryColumn.Id }],
  layout: "stack",
  withLegend: false,
  chartStyle: {
    xAxis: { label: "Quarter" },
    grid: { color: "#e0e0e0" },
    legend: { position: "left" },
  },
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

describe("Data Explorer viz config memory", () => {
  it("restores the bar config after a round trip through pie", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(STYLED_BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType("pie");
    });

    expect(result.current[0].vizConfig.vizType).toBe("pie");

    act(() => {
      result.current[1].setActiveVizType("bar");
    });

    expect(result.current[0].vizConfig).toStrictEqual(STYLED_BAR_CONFIG);
  });

  it("keeps styling a pie config cannot carry", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(STYLED_BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType("pie");
    });

    // The pie config genuinely has nowhere to hold these.
    expect(result.current[0].vizConfig).not.toHaveProperty("chartStyle");

    act(() => {
      result.current[1].setActiveVizType("bar");
    });

    const restoredVizConfig = result.current[0].vizConfig as BarChartVizConfig;
    expect(restoredVizConfig.chartStyle?.legend?.position).toBe("left");
    expect(restoredVizConfig.chartStyle?.grid?.color).toBe("#e0e0e0");
    expect(restoredVizConfig.layout).toBe("stack");
    expect(restoredVizConfig.withLegend).toBe(false);
  });

  it("falls back to converting when the target has no memory", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(STYLED_BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType("line");
    });

    // Type conversion preserves owned IDs even while result metadata is absent.
    const convertedVizConfig = result.current[0].vizConfig;
    expect(convertedVizConfig.vizType).toBe("line");
    expect(convertedVizConfig).toStrictEqual({
      vizType: "line",
      xAxisKey: STYLED_BAR_CONFIG.xAxisKey,
      series: [
        {
          renderAs: "line",
          key: STYLED_BAR_CONFIG.series[0]!.key,
          label: undefined,
          color: undefined,
        },
      ],
      withLegend: false,
      chartStyle: STYLED_BAR_CONFIG.chartStyle,
    });
  });

  it("remembers the outgoing config keyed by its own viz type", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(STYLED_BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType("pie");
    });

    expect(result.current[0].vizConfigMemory.bar).toStrictEqual(
      STYLED_BAR_CONFIG,
    );
    expect(result.current[0].vizConfigMemory.pie).toBeUndefined();
  });

  it("ignores a switch to the type already active", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(STYLED_BAR_CONFIG);
    });
    const stateBeforeReselection = result.current[0];

    act(() => {
      result.current[1].setActiveVizType("bar");
    });

    expect(result.current[0]).toBe(stateBeforeReselection);
  });

  it("retains a remembered selection when its ID is missing", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(STYLED_BAR_CONFIG);
    });
    act(() => {
      result.current[1].syncVizFromQueryResult(COLUMNS);
    });
    act(() => {
      result.current[1].setActiveVizType("pie");
    });

    // The next query no longer returns `revenue`, so the remembered bar
    // config's series key can no longer resolve.
    act(() => {
      result.current[1].syncVizFromQueryResult([
        {
          id: "quarter" as QueryColumn.Id,
          name: "quarter",
          dataType: "varchar",
        },
        { id: "profit" as QueryColumn.Id, name: "profit", dataType: "double" },
      ]);
    });
    act(() => {
      result.current[1].setActiveVizType("bar");
    });

    const restoredVizConfig = result.current[0].vizConfig as BarChartVizConfig;

    // The missing selection remains owned until explicit repair.
    const seriesKeys = restoredVizConfig.series.map((entry) => {
      return entry.key;
    });
    expect(seriesKeys).toEqual(["revenue"]);

    // These values prove the remembered config was retained: a fresh
    // projection from pie cannot carry any of them.
    expect(restoredVizConfig.chartStyle?.grid?.color).toBe("#e0e0e0");
    expect(restoredVizConfig.chartStyle?.legend?.position).toBe("left");
    expect(restoredVizConfig.layout).toBe("stack");
  });
});
