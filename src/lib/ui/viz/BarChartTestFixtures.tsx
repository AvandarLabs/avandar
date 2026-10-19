import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { render } from "@/test-utils";
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
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";

type BarChartVizConfig = Extract<VizConfig.Resolved, { vizType: "bar" }>;

const mantineBarChartMock = vi.fn();

const mantineCompositeChartMock = vi.fn();

vi.mock("@mantine/charts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/charts")>();
  return {
    ...actual,
    BarChart: (props: unknown) => {
      mantineBarChartMock(props);
      return <div data-testid="mantine-bar" />;
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

  mantineCompositeChartMock.mockClear();
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

const BAR_BASELINE: BarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "x",
  series: [{ renderAs: "bar", key: "v" }],
  layout: "group",
  withLegend: true,
};

/** Shared setup and fixtures for BarChartTestFixtures. */
export const BarChartTestFixtures = {
  expect,
  it,
  AvandarAppProvider,
  BarChart,
  render,
  mantineBarChartMock,
  mantineCompositeChartMock,
  lastProps,
  renderBar,
  BAR_BASELINE,
};
