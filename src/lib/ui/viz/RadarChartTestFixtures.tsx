import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { RadarChart } from "@/lib/ui/viz/RadarChart";
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

type RadarChartVizConfig = Extract<VizConfig.Resolved, { vizType: "radar" }>;

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

const RADAR_BASELINE: RadarChartVizConfig = {
  vizType: "radar",
  nameKey: "x",
  series: [{ key: "v" }],
  withLegend: true,
};

/** Shared setup and fixtures for RadarChartTestFixtures. */
export const RadarChartTestFixtures = {
  expect,
  it,
  mantineRadarChartMock,
  lastProps,
  renderRadar,
  RADAR_BASELINE,
};
