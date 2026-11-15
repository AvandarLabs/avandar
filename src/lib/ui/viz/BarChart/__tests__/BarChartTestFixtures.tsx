import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { BarChart } from "@/lib/ui/viz/BarChart/BarChart";
import { render } from "@/test-utils";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

type UiVizConfigBar = Extract<UiVizConfig, { vizType: "bar" }>;

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

function renderBar(config: UiVizConfigBar): void {
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

const BAR_BASELINE: UiVizConfigBar = {
  vizType: "bar",
  xAxisKey: "x",
  series: [{ renderAs: "bar", key: "v" }],
  layout: "group",
  withLegend: true,
};

/**
 * Setup for the `BarChart` props tests, which check that each chart and
 * series setting in a bar `UiVizConfig` reaches the right prop on the chart
 * it renders. Importing it mocks Mantine's `BarChart` and `CompositeChart`
 * to record their props, and `renderBar` and `lastProps` render a config and
 * read those props back.
 */
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
