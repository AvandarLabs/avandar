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
import type { RenderHookResult } from "@testing-library/react";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
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

    const restored = result.current[0].vizConfig as BarChartVizConfig;
    expect(restored.chartStyle?.legend?.position).toBe("left");
    expect(restored.chartStyle?.grid?.color).toBe("#e0e0e0");
    expect(restored.layout).toBe("stack");
    expect(restored.withLegend).toBe(false);
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
    const converted = result.current[0].vizConfig;
    expect(converted.vizType).toBe("line");
    expect(converted).toStrictEqual({
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
    const before = result.current[0];

    act(() => {
      result.current[1].setActiveVizType("bar");
    });

    expect(result.current[0]).toBe(before);
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

    const restored = result.current[0].vizConfig as BarChartVizConfig;

    // The stale series key is gone.
    const seriesKeys = restored.series.map((entry) => {
      return entry.key;
    });
    expect(seriesKeys).not.toContain("revenue");

    // ...and what is left is the remembered bar config repaired in place, not
    // a fresh projection of the pie config. Only the remembered config can
    // carry chartStyle, since a pie config has nowhere to hold it, so these
    // assertions are what distinguish "restored and repaired" from "never
    // remembered at all".
    expect(restored.chartStyle?.grid?.color).toBe("#e0e0e0");
    expect(restored.chartStyle?.legend?.position).toBe("left");
    expect(restored.layout).toBe("stack");
  });
});
