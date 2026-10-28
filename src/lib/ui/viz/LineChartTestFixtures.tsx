import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { LineChart } from "@/lib/ui/viz/LineChart";
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

type LineChartVizConfig = Extract<VizConfig.NameResolved, { vizType: "line" }>;

const mantineLineChartMock = vi.fn();

vi.mock("@mantine/charts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/charts")>();
  return {
    ...actual,
    LineChart: (props: unknown) => {
      mantineLineChartMock(props);
      return <div data-testid="mantine-line" />;
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
  mantineLineChartMock.mockClear();
});

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

const LINE_BASELINE: LineChartVizConfig = {
  vizType: "line",
  xAxisKey: "x",
  series: [{ renderAs: "line", key: "v" }],
  withLegend: true,
};

/** Shared setup and fixtures for LineChartTestFixtures. */
export const LineChartTestFixtures = {
  expect,
  it,
  mantineLineChartMock,
  lastProps,
  renderLine,
  LINE_BASELINE,
};
