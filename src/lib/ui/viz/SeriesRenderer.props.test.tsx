/**
 * Renderer-level prop verification for the series-aware chart wrappers.
 *
 * These tests intercept the underlying Mantine / Recharts components and
 * assert that each chart-level and series-level setting flows through to
 * the right prop on the rendered chart. Pairs with
 * `SeriesAwareVizForm.descriptors.test.tsx`: the form tests prove
 * "changing a control updates the config"; these tests prove
 * "changing a config setting updates what the chart renders".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { RadarChart } from "@/lib/ui/viz/RadarChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import { render } from "@/test-utils";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";
import type { ReactNode } from "react";

const mantineBarChartMock = vi.fn();
const mantineLineChartMock = vi.fn();
const mantineRadarChartMock = vi.fn();
const mantineCompositeChartMock = vi.fn();

const rechartsXAxisMock = vi.fn();
const rechartsYAxisMock = vi.fn();
const rechartsScatterMock = vi.fn();
const rechartsLegendMock = vi.fn();

vi.mock("@mantine/charts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/charts")>();
  return {
    ...actual,
    BarChart: (props: unknown) => {
      mantineBarChartMock(props);
      return <div data-testid="mantine-bar" />;
    },
    LineChart: (props: unknown) => {
      mantineLineChartMock(props);
      return <div data-testid="mantine-line" />;
    },
    RadarChart: (props: unknown) => {
      mantineRadarChartMock(props);
      return <div data-testid="mantine-radar" />;
    },
    CompositeChart: (props: unknown) => {
      mantineCompositeChartMock(props);
      return <div data-testid="mantine-composite" />;
    },
  };
});

// ScatterChart renders Recharts primitives directly (not Mantine's
// ScatterChart), so intercept the Recharts elements it emits.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => {
      return <div>{children}</div>;
    },
    ScatterChart: ({ children }: { children?: ReactNode }) => {
      return <div data-testid="recharts-scatter">{children}</div>;
    },
    CartesianGrid: () => {
      return null;
    },
    Tooltip: () => {
      return null;
    },
    XAxis: (props: unknown) => {
      rechartsXAxisMock(props);
      return null;
    },
    YAxis: (props: unknown) => {
      rechartsYAxisMock(props);
      return null;
    },
    Legend: (props: unknown) => {
      rechartsLegendMock(props);
      return null;
    },
    Scatter: (props: unknown) => {
      rechartsScatterMock(props);
      return null;
    },
  };
});

const DATA = [
  { x: "a", v: 1, w: 5 },
  { x: "b", v: 2, w: 4 },
  { x: "c", v: 3, w: 3 },
];

function lastProps<T>(mock: ReturnType<typeof vi.fn>): T {
  const call = mock.mock.lastCall;
  if (call === undefined) {
    throw new Error("Mock was not called");
  }
  return call[0] as T;
}

beforeEach(() => {
  mantineBarChartMock.mockClear();
  mantineLineChartMock.mockClear();
  mantineRadarChartMock.mockClear();
  mantineCompositeChartMock.mockClear();
  rechartsXAxisMock.mockClear();
  rechartsYAxisMock.mockClear();
  rechartsScatterMock.mockClear();
  rechartsLegendMock.mockClear();
});

function renderBar(config: BarChartVizConfig): void {
  render(
    <AvandarAppProvider>
      <BarChart
        data={DATA}
        height={400}
        xAxisKey={config.xAxisKey ?? "x"}
        series={config.series}
        layout={config.layout}
        withLegend={config.withLegend}
        chartStyle={config.chartStyle}
      />
    </AvandarAppProvider>,
  );
}

function renderLine(config: LineChartVizConfig): void {
  render(
    <AvandarAppProvider>
      <LineChart
        data={DATA}
        height={400}
        xAxisKey={config.xAxisKey ?? "x"}
        series={config.series}
        withLegend={config.withLegend}
        chartStyle={config.chartStyle}
      />
    </AvandarAppProvider>,
  );
}

function renderRadar(config: RadarChartVizConfig): void {
  render(
    <AvandarAppProvider>
      <RadarChart
        data={DATA}
        nameKey={config.nameKey ?? "x"}
        series={config.series}
        withLegend={config.withLegend}
        chartStyle={config.chartStyle}
      />
    </AvandarAppProvider>,
  );
}

const BAR_BASELINE: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "x",
  series: [{ renderAs: "bar", key: "v" }],
  layout: "group",
  withLegend: true,
};

const LINE_BASELINE: LineChartVizConfig = {
  vizType: "line",
  xAxisKey: "x",
  series: [{ renderAs: "line", key: "v" }],
  withLegend: true,
};

const RADAR_BASELINE: RadarChartVizConfig = {
  vizType: "radar",
  nameKey: "x",
  series: [{ key: "v" }],
  withLegend: true,
};

describe("BarChart — chart-level settings reach Mantine", () => {
  it('passes layout "group" as type "default"', () => {
    renderBar(BAR_BASELINE);
    expect(lastProps<{ type: string }>(mantineBarChartMock).type).toBe(
      "default",
    );
  });

  it('passes layout "stack" as type "stacked"', () => {
    renderBar({ ...BAR_BASELINE, layout: "stack" });
    expect(lastProps<{ type: string }>(mantineBarChartMock).type).toBe(
      "stacked",
    );
  });

  it('passes layout "percent" through', () => {
    renderBar({ ...BAR_BASELINE, layout: "percent" });
    expect(lastProps<{ type: string }>(mantineBarChartMock).type).toBe(
      "percent",
    );
  });

  it("propagates withLegend", () => {
    renderBar({ ...BAR_BASELINE, withLegend: false });
    expect(
      lastProps<{ withLegend: boolean }>(mantineBarChartMock).withLegend,
    ).toBe(false);
  });

  it("hides axes when chartStyle.{x,y}Axis.hide is true", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { xAxis: { hide: true }, yAxis: { hide: true } },
    });
    const props = lastProps<{ withXAxis: boolean; withYAxis: boolean }>(
      mantineBarChartMock,
    );
    expect(props.withXAxis).toBe(false);
    expect(props.withYAxis).toBe(false);
  });

  it("applies axis label via xAxisLabel and color via styles.axisLabel.fill", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { xAxis: { label: "Month", labelColor: "#ff0000" } },
    });
    const props = lastProps<{
      xAxisLabel?: string;
      styles?: { axisLabel?: { fill?: string } };
    }>(mantineBarChartMock);
    expect(props.xAxisLabel).toBe("Month");
    expect(props.styles?.axisLabel?.fill).toBe("#ff0000");
  });

  it("applies tick color via xAxisProps.tick.fill", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { xAxis: { tickColor: "#00ff00" } },
    });
    const props = lastProps<{
      xAxisProps?: { tick?: { fill?: string } };
    }>(mantineBarChartMock);
    expect(props.xAxisProps?.tick?.fill).toBe("#00ff00");
  });

  it("applies grid color via gridProps.stroke", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { grid: { color: "#0000ff" } },
    });
    const props = lastProps<{ gridProps?: { stroke?: string } }>(
      mantineBarChartMock,
    );
    expect(props.gridProps?.stroke).toBe("#0000ff");
  });

  it("toggles horizontal/vertical gridlines", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { grid: { horizontal: false, vertical: true } },
    });
    const props = lastProps<{
      gridProps?: { horizontal?: boolean; vertical?: boolean };
    }>(mantineBarChartMock);
    expect(props.gridProps?.horizontal).toBe(false);
    expect(props.gridProps?.vertical).toBe(true);
  });

  it("maps legend.position to legendProps.verticalAlign/align", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { legend: { position: "bottom" } },
    });
    const props = lastProps<{
      legendProps?: { verticalAlign?: string; align?: string };
    }>(mantineBarChartMock);
    expect(props.legendProps?.verticalAlign).toBe("bottom");
  });
});

describe("BarChart — series-level settings reach barProps callback", () => {
  it("series color reaches the series entry", () => {
    renderBar({
      ...BAR_BASELINE,
      series: [{ renderAs: "bar", key: "v", color: "#ff00ff" }],
    });
    const props = lastProps<{
      series: ReadonlyArray<{ name: string; color?: string }>;
    }>(mantineBarChartMock);
    expect(props.series[0]?.color).toBe("#ff00ff");
  });

  it("series fillOpacity reaches barProps callback output", () => {
    renderBar({
      ...BAR_BASELINE,
      series: [{ renderAs: "bar", key: "v", fillOpacity: 0.3 }],
    });
    const props = lastProps<{
      barProps: (s: { name: string }) => {
        fillOpacity?: number;
        stackId?: string;
      };
    }>(mantineBarChartMock);
    expect(props.barProps({ name: "v" }).fillOpacity).toBe(0.3);
  });

  it("series stackId reaches barProps callback output", () => {
    renderBar({
      ...BAR_BASELINE,
      series: [{ renderAs: "bar", key: "v", stackId: "g1" }],
    });
    const props = lastProps<{
      barProps: (s: { name: string }) => { stackId?: string };
    }>(mantineBarChartMock);
    expect(props.barProps({ name: "v" }).stackId).toBe("g1");
  });
});

describe("BarChart — mixed renderAs falls back to CompositeChart", () => {
  it("renders CompositeChart when any series renderAs differs", () => {
    renderBar({
      ...BAR_BASELINE,
      series: [
        { renderAs: "bar", key: "v" },
        { renderAs: "line", key: "w" },
      ],
    });
    expect(mantineCompositeChartMock).toHaveBeenCalledOnce();
    expect(mantineBarChartMock).not.toHaveBeenCalled();
    const props = lastProps<{
      series: ReadonlyArray<{ name: string; type: string }>;
    }>(mantineCompositeChartMock);
    expect(props.series[0]).toMatchObject({ name: "v", type: "bar" });
    expect(props.series[1]).toMatchObject({ name: "w", type: "line" });
  });

  it("composite line series strokeWidth flows through lineProps", () => {
    renderBar({
      ...BAR_BASELINE,
      series: [
        { renderAs: "bar", key: "v" },
        { renderAs: "line", key: "w", strokeWidth: 5 },
      ],
    });
    const props = lastProps<{
      lineProps: (s: { name: string }) => { strokeWidth?: number };
    }>(mantineCompositeChartMock);
    expect(props.lineProps({ name: "w" }).strokeWidth).toBe(5);
  });

  it("composite line series curveType flows through lineProps.type", () => {
    renderBar({
      ...BAR_BASELINE,
      series: [
        { renderAs: "bar", key: "v" },
        { renderAs: "line", key: "w", curveType: "step" },
      ],
    });
    const props = lastProps<{
      lineProps: (s: { name: string }) => { type?: string };
    }>(mantineCompositeChartMock);
    expect(props.lineProps({ name: "w" }).type).toBe("step");
  });
});

describe("LineChart — series settings reach Mantine", () => {
  it("series curveType reaches the series entry", () => {
    renderLine({
      ...LINE_BASELINE,
      series: [{ renderAs: "line", key: "v", curveType: "linear" }],
    });
    const props = lastProps<{
      series: ReadonlyArray<{ name: string; curveType?: string }>;
    }>(mantineLineChartMock);
    expect(props.series[0]?.curveType).toBe("linear");
  });

  it("series strokeWidth flows through lineProps", () => {
    renderLine({
      ...LINE_BASELINE,
      series: [{ renderAs: "line", key: "v", strokeWidth: 4 }],
    });
    const props = lastProps<{
      lineProps: (s: { name: string }) => { strokeWidth?: number };
    }>(mantineLineChartMock);
    expect(props.lineProps({ name: "v" }).strokeWidth).toBe(4);
  });

  it("series withDots flows through lineProps.dot", () => {
    renderLine({
      ...LINE_BASELINE,
      series: [{ renderAs: "line", key: "v", withDots: false }],
    });
    const props = lastProps<{
      lineProps: (s: { name: string }) => { dot?: boolean };
    }>(mantineLineChartMock);
    expect(props.lineProps({ name: "v" }).dot).toBe(false);
  });
});

describe("RadarChart — series settings reach Mantine", () => {
  it("series color and fillOpacity reach the series entry", () => {
    renderRadar({
      ...RADAR_BASELINE,
      series: [{ key: "v", color: "#abcdef", fillOpacity: 0.4 }],
    });
    const props = lastProps<{
      series: ReadonlyArray<{ color?: string; opacity?: number }>;
    }>(mantineRadarChartMock);
    expect(props.series[0]?.color).toBe("#abcdef");
    expect(props.series[0]?.opacity).toBe(0.4);
  });

  it("series strokeWidth reaches the series entry", () => {
    renderRadar({
      ...RADAR_BASELINE,
      series: [{ key: "v", strokeWidth: 3 }],
    });
    const props = lastProps<{
      series: ReadonlyArray<{ strokeWidth?: number }>;
    }>(mantineRadarChartMock);
    expect(props.series[0]?.strokeWidth).toBe(3);
  });

  it("withLegend flows through", () => {
    renderRadar({ ...RADAR_BASELINE, withLegend: false });
    expect(
      lastProps<{ withLegend: boolean }>(mantineRadarChartMock).withLegend,
    ).toBe(false);
  });
});

describe("BarChart: axis scale and rotation", () => {
  it("passes an explicit Y domain and generated ticks", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { yAxis: { min: 0, max: 120000, tickInterval: 24000 } },
    });
    const props = lastProps<{
      yAxisProps?: { domain?: unknown; ticks?: number[] };
    }>(mantineBarChartMock);
    expect(props.yAxisProps?.domain).toEqual([0, 120000]);
    expect(props.yAxisProps?.ticks).toEqual([
      0, 24000, 48000, 72000, 96000, 120000,
    ]);
  });

  it("derives the Y domain from the data when only an interval is set", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { yAxis: { tickInterval: 1 } },
    });
    const props = lastProps<{ yAxisProps?: { ticks?: number[] } }>(
      mantineBarChartMock,
    );
    expect(props.yAxisProps?.ticks).toEqual([0, 1, 2, 3]);
  });

  it("sums stacked series when deriving the Y extent", () => {
    renderBar({
      ...BAR_BASELINE,
      layout: "stack",
      series: [
        { renderAs: "bar", key: "v" },
        { renderAs: "bar", key: "w" },
      ],
      chartStyle: { yAxis: { tickInterval: 6 } },
    });
    // Row sums are 6, 6, 6, so the derived high lands on the first tick
    // past the data rather than on the largest single value (3).
    const props = lastProps<{ yAxisProps?: { domain?: unknown } }>(
      mantineBarChartMock,
    );
    expect(props.yAxisProps?.domain).toEqual([0, 6]);
  });

  it("ignores value settings on the category X axis", () => {
    renderBar({
      ...BAR_BASELINE,
      chartStyle: { xAxis: { min: 0, max: 10 } },
    });
    const props = lastProps<{ xAxisProps?: { domain?: unknown } }>(
      mantineBarChartMock,
    );
    expect(props.xAxisProps?.domain).toBeUndefined();
  });

  it("rotates X tick labels and grows the axis to fit them", () => {
    // Axis height is estimated from the longest tick label, and the
    // one-character categories in `DATA` stay under Recharts' 30px
    // floor however they are rotated. These labels are long enough
    // that a correctly sized axis has to grow past it.
    render(
      <AvandarAppProvider>
        <BarChart
          data={[
            { x: "September 2024", v: 1 },
            { x: "October 2024", v: 2 },
          ]}
          height={400}
          xAxisKey="x"
          series={BAR_BASELINE.series}
          chartStyle={{ xAxis: { tickAngle: -90 } }}
        />
      </AvandarAppProvider>,
    );
    const props = lastProps<{
      xAxisProps?: {
        tick?: { angle?: number; textAnchor?: string };
        interval?: number;
        height?: number;
      };
    }>(mantineBarChartMock);
    expect(props.xAxisProps?.tick?.angle).toBe(-90);
    expect(props.xAxisProps?.tick?.textAnchor).toBe("end");
    expect(props.xAxisProps?.interval).toBe(0);
    expect(props.xAxisProps?.height).toBeGreaterThan(30);
  });

  it("adds no domain or ticks when no axis settings are configured", () => {
    renderBar(BAR_BASELINE);
    const props = lastProps<{
      xAxisProps?: { domain?: unknown; height?: unknown };
      yAxisProps?: { domain?: unknown; ticks?: unknown };
    }>(mantineBarChartMock);
    expect(props.yAxisProps?.domain).toBeUndefined();
    expect(props.yAxisProps?.ticks).toBeUndefined();
    expect(props.xAxisProps?.height).toBeUndefined();
  });
});

describe("LineChart: axis scale and rotation", () => {
  it("passes an explicit Y domain and generated ticks", () => {
    renderLine({
      ...LINE_BASELINE,
      chartStyle: { yAxis: { min: 0, max: 10, tickInterval: 5 } },
    });
    const props = lastProps<{
      yAxisProps?: { domain?: unknown; ticks?: number[] };
    }>(mantineLineChartMock);
    expect(props.yAxisProps?.domain).toEqual([0, 10]);
    expect(props.yAxisProps?.ticks).toEqual([0, 5, 10]);
  });

  it("never stacks when deriving the Y extent", () => {
    renderLine({
      ...LINE_BASELINE,
      series: [
        { renderAs: "line", key: "v" },
        { renderAs: "line", key: "w" },
      ],
      chartStyle: { yAxis: { tickInterval: 1 } },
    });
    // Largest single value is 5, not the row sum of 6.
    const props = lastProps<{ yAxisProps?: { domain?: unknown } }>(
      mantineLineChartMock,
    );
    expect(props.yAxisProps?.domain).toEqual([0, 5]);
  });

  it("rotates X tick labels", () => {
    renderLine({
      ...LINE_BASELINE,
      chartStyle: { xAxis: { tickAngle: 45 } },
    });
    const props = lastProps<{
      xAxisProps?: { tick?: { angle?: number; textAnchor?: string } };
    }>(mantineLineChartMock);
    expect(props.xAxisProps?.tick?.angle).toBe(45);
    expect(props.xAxisProps?.tick?.textAnchor).toBe("start");
  });
});

function _renderScatter(
  chartStyle?: ChartStyle,
  series: ScatterSeries[] = [{ key: "w", xKey: "v" }],
): void {
  render(
    <AvandarAppProvider>
      <ScatterChart data={DATA} series={series} chartStyle={chartStyle} />
    </AvandarAppProvider>,
  );
}

// ScatterChart is rendered with Recharts primitives, so these assert the
// props on the intercepted <XAxis> / <YAxis> / <Scatter> / <Legend> rather
// than on a Mantine wrapper.
describe("ScatterChart: both axes are value axes", () => {
  it("bounds the X axis", () => {
    _renderScatter({ xAxis: { min: 0, max: 4, tickInterval: 1 } });
    const props = lastProps<{ domain?: unknown; ticks?: number[] }>(
      rechartsXAxisMock,
    );
    expect(props.domain).toEqual([0, 4]);
    expect(props.ticks).toEqual([0, 1, 2, 3, 4]);
  });

  it("bounds the Y axis", () => {
    _renderScatter({ yAxis: { min: 0, max: 40, tickInterval: 20 } });
    const props = lastProps<{ ticks?: number[] }>(rechartsYAxisMock);
    expect(props.ticks).toEqual([0, 20, 40]);
  });

  it("derives the X extent from the xKey column, not the Y column", () => {
    _renderScatter({ xAxis: { tickInterval: 1 } });
    const props = lastProps<{ domain?: unknown }>(rechartsXAxisMock);
    // `v` runs 1 to 3, so the derived domain is 0 to 3. Reading `w`
    // instead would give 0 to 5, which is what this case rules out.
    expect(props.domain).toEqual([0, 3]);
  });

  it("prefers a configured axis label over the derived column name", () => {
    _renderScatter({ xAxis: { label: "Spend" } });
    const props = lastProps<{ label?: { value?: string } }>(rechartsXAxisMock);
    expect(props.label?.value).toBe("Spend");
  });

  it("derives the axis label from the column when unset", () => {
    _renderScatter(undefined);
    const props = lastProps<{ label?: { value?: string } }>(rechartsXAxisMock);
    expect(props.label?.value).toBe("v");
  });

  it("gives each axis label its own color", () => {
    _renderScatter({
      xAxis: { label: "Spend", labelColor: "#ff0000" },
      yAxis: { label: "Revenue", labelColor: "#0000ff" },
    });
    const x = lastProps<{ label?: { value?: string; fill?: string } }>(
      rechartsXAxisMock,
    );
    const y = lastProps<{ label?: { value?: string; fill?: string } }>(
      rechartsYAxisMock,
    );
    // X and Y label colors must stay independent; the old Mantine path
    // collapsed both into a single shared styles.axisLabel fill.
    expect(x.label?.value).toBe("Spend");
    expect(x.label?.fill).toBe("#ff0000");
    expect(y.label?.value).toBe("Revenue");
    expect(y.label?.fill).toBe("#0000ff");
  });

  it("renders each series with its own color and label", () => {
    _renderScatter(undefined, [
      { key: "w", xKey: "v", label: "Alpha", color: "#123456" },
      { key: "v", xKey: "w", label: "Beta", color: "#abcdef" },
    ]);
    expect(rechartsScatterMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alpha", fill: "#123456" }),
    );
    expect(rechartsScatterMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Beta", fill: "#abcdef" }),
    );
  });

  it("renders the legend even for a single series", () => {
    _renderScatter(undefined, [{ key: "w", xKey: "v" }]);
    expect(rechartsLegendMock).toHaveBeenCalled();
  });

  it("rotates X tick labels", () => {
    _renderScatter({ xAxis: { tickAngle: -90 } });
    const props = lastProps<{
      tick?: { angle?: number };
      interval?: number;
    }>(rechartsXAxisMock);
    expect(props.tick?.angle).toBe(-90);
    expect(props.interval).toBe(0);
  });

  it("adds no domain or ticks when nothing is configured", () => {
    _renderScatter(undefined);
    const props = lastProps<{ domain?: unknown; ticks?: unknown }>(
      rechartsXAxisMock,
    );
    expect(props.domain).toBeUndefined();
    expect(props.ticks).toBeUndefined();
  });
});

// AreaChart is intentionally exempt from this prop-mock pattern because it
// uses Recharts primitives directly (documented Mantine wrapper bug). Its
// per-series behavior is exercised end-to-end via the e2e visualization
// spec.
