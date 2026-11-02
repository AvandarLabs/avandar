import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { LineChart } from "@/lib/ui/viz/LineChart/LineChart";
import { render } from "@/test-utils";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

type UiVizConfigLine = Extract<UiVizConfig, { vizType: "line" }>;

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

function renderLine(config: UiVizConfigLine): void {
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

const LINE_BASELINE: UiVizConfigLine = {
  vizType: "line",
  xAxisKey: "x",
  series: [{ renderAs: "line", key: "v" }],
  withLegend: true,
};

/**
 * Setup for the `LineChart` props tests, which check that each chart and
 * series setting in a line `UiVizConfig` reaches the right prop on the chart
 * it renders. Importing it mocks Mantine's `LineChart` to record its props,
 * and `renderLine` and `lastProps` render a config and read them back.
 */
export const LineChartTestFixtures = {
  expect,
  it,
  mantineLineChartMock,
  lastProps,
  renderLine,
  LINE_BASELINE,
};
