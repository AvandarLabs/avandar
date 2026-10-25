import { beforeEach, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart";
import { render } from "@/test-utils";
import type { ChartStyle } from "$/models/vizs/ChartStyle.types";
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
import type { LegacyScatterSeries as ScatterSeries } from "$/models/vizs/ColumnIdVizConfig/LegacyVizConfig.types";
import type { ReactNode } from "react";

const rechartsXAxisMock = vi.fn();

const rechartsYAxisMock = vi.fn();

const rechartsScatterMock = vi.fn();

const rechartsLegendMock = vi.fn();

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
  rechartsXAxisMock.mockClear();
  rechartsYAxisMock.mockClear();
  rechartsScatterMock.mockClear();
  rechartsLegendMock.mockClear();
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
/** Shared setup and fixtures for ScatterChartTestFixtures. */
export const ScatterChartTestFixtures = {
  expect,
  it,
  rechartsXAxisMock,
  rechartsYAxisMock,
  rechartsScatterMock,
  rechartsLegendMock,
  lastProps,
  _renderScatter,
};
