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
import { AvandarUiProvider } from "@/components/AvandarUiProvider";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { LineChart } from "@/lib/ui/viz/LineChart";
import { RadarChart } from "@/lib/ui/viz/RadarChart";
import { render } from "@/test-utils";
import type { BarChartVizConfig } from "$/models/vizs/BarChartVizConfig/BarChartVizConfig.types";
import type { LineChartVizConfig } from "$/models/vizs/LineChartVizConfig/LineChartVizConfig.types";
import type { RadarChartVizConfig } from "$/models/vizs/RadarChartVizConfig/RadarChartVizConfig.types";

const mantineBarChartMock = vi.fn();
const mantineLineChartMock = vi.fn();
const mantineRadarChartMock = vi.fn();
const mantineCompositeChartMock = vi.fn();

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
});

function renderBar(config: BarChartVizConfig): void {
  render(
    <AvandarUiProvider>
      <BarChart
        data={DATA}
        height={400}
        xAxisKey={config.xAxisKey ?? "x"}
        series={config.series}
        layout={config.layout}
        withLegend={config.withLegend}
        chartStyle={config.chartStyle}
      />
    </AvandarUiProvider>,
  );
}

function renderLine(config: LineChartVizConfig): void {
  render(
    <AvandarUiProvider>
      <LineChart
        data={DATA}
        height={400}
        xAxisKey={config.xAxisKey ?? "x"}
        series={config.series}
        withLegend={config.withLegend}
        chartStyle={config.chartStyle}
      />
    </AvandarUiProvider>,
  );
}

function renderRadar(config: RadarChartVizConfig): void {
  render(
    <AvandarUiProvider>
      <RadarChart
        data={DATA}
        nameKey={config.nameKey ?? "x"}
        series={config.series}
        withLegend={config.withLegend}
        chartStyle={config.chartStyle}
      />
    </AvandarUiProvider>,
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

// AreaChart is intentionally exempt from this prop-mock pattern because it
// uses Recharts primitives directly (documented Mantine wrapper bug). Its
// per-series behavior is exercised end-to-end via the e2e visualization
// spec.
