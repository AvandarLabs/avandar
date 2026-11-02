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
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const COLUMNS: readonly QueryResultColumn[] = [
  { name: "quarter", dataType: "varchar" },
  { name: "revenue", dataType: "double" },
];

const STYLED_BAR_CONFIG: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "quarter",
  series: [{ renderAs: "bar", key: "revenue" }],
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

    // With no memory for the target type, the action converts the current
    // config and then applies structured hydration. Hydration prunes keys the
    // (empty) structured query cannot account for, which is why xAxisKey does
    // not survive here.
    const convertedVizConfig = result.current[0].vizConfig;
    expect(convertedVizConfig.vizType).toBe("line");
    expect(convertedVizConfig).toStrictEqual({
      vizType: "line",
      xAxisKey: undefined,
      series: [],
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

  it("repairs a remembered config that names a dropped column", () => {
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
        { name: "quarter", dataType: "varchar" },
        { name: "profit", dataType: "double" },
      ]);
    });
    act(() => {
      result.current[1].setActiveVizType("bar");
    });

    const restoredVizConfig = result.current[0].vizConfig as BarChartVizConfig;

    // The stale series key is gone.
    const seriesKeys = restoredVizConfig.series.map((entry) => {
      return entry.key;
    });
    expect(seriesKeys).not.toContain("revenue");

    // These values prove the remembered config was repaired: a fresh
    // projection from pie cannot carry any of them.
    expect(restoredVizConfig.chartStyle?.grid?.color).toBe("#e0e0e0");
    expect(restoredVizConfig.chartStyle?.legend?.position).toBe("left");
    expect(restoredVizConfig.layout).toBe("stack");
  });
});
