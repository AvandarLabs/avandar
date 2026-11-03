import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { RadarChart } from "@/lib/ui/viz/RadarChart/RadarChart";
import { render } from "@/test-utils";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

type UiVizConfigRadar = Extract<UiVizConfig, { vizType: "radar" }>;

const mantineRadarChartMock = vi.fn();

vi.mock("@mantine/charts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/charts")>();
  return {
    ...actual,
    RadarChart: (props: unknown) => {
      mantineRadarChartMock(props);
      return <div data-testid="mantine-radar" />;
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
  mantineRadarChartMock.mockClear();
});

function renderRadar(config: UiVizConfigRadar): void {
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

const RADAR_BASELINE: UiVizConfigRadar = {
  vizType: "radar",
  nameKey: "x",
  series: [{ key: "v" }],
  withLegend: true,
};

/**
 * Setup for the `RadarChart` props tests, which check that each chart and
 * series setting in a radar `UiVizConfig` reaches the right prop on the
 * chart it renders. Importing it mocks Mantine's `RadarChart` to record its
 * props, and `renderRadar` and `lastProps` render a config and read them
 * back.
 */
export const RadarChartTestFixtures = {
  expect,
  it,
  mantineRadarChartMock,
  lastProps,
  renderRadar,
  RADAR_BASELINE,
};
