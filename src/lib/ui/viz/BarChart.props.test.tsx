import { BarChartTestFixtures } from "./BarChartTestFixtures";
type LegendPropsHolder = {
  legendProps?: {
    verticalAlign?: string;
    align?: string;
    layout?: string;
    width?: number;
  };
};
const {
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
} = BarChartTestFixtures;

it('passes layout "group" as type "default"', () => {
  renderBar(BAR_BASELINE);
  expect(lastProps<{ type: string }>(mantineBarChartMock).type).toBe("default");
});

it('passes layout "stack" as type "stacked"', () => {
  renderBar({ ...BAR_BASELINE, layout: "stack" });
  expect(lastProps<{ type: string }>(mantineBarChartMock).type).toBe("stacked");
});

it('passes layout "percent" through', () => {
  renderBar({ ...BAR_BASELINE, layout: "percent" });
  expect(lastProps<{ type: string }>(mantineBarChartMock).type).toBe("percent");
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

it("renders per-axis labels with independent colors via <Label> children", () => {
  renderBar({
    ...BAR_BASELINE,
    chartStyle: {
      xAxis: { label: "Month", labelColor: "#ff0000" },
      yAxis: { label: "Revenue", labelColor: "#0000ff" },
    },
  });
  const props = lastProps<{
    xAxisLabel?: string;
    styles?: { axisLabel?: { fill?: string } };
    xAxisProps?: { children?: { props?: { value?: string; fill?: string } } };
    yAxisProps?: { children?: { props?: { value?: string; fill?: string } } };
  }>(mantineBarChartMock);
  expect(props.xAxisLabel).toBeUndefined();
  expect(props.styles?.axisLabel?.fill).toBeUndefined();
  expect(props.xAxisProps?.children?.props?.value).toBe("Month");
  expect(props.xAxisProps?.children?.props?.fill).toBe("#ff0000");
  expect(props.yAxisProps?.children?.props?.value).toBe("Revenue");
  expect(props.yAxisProps?.children?.props?.fill).toBe("#0000ff");
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
  const props = lastProps<LegendPropsHolder>(mantineBarChartMock);
  expect(props.legendProps?.verticalAlign).toBe("bottom");
  expect(props.legendProps?.align).toBe("center");
});

// A side legend also needs `layout` and `width`. Recharts sizes a
// horizontal legend to the full chart width and reserves that much
// plot space, which would collapse the plot to zero width for
// left/right.
it("gives a left legend a vertical layout and its own width", () => {
  renderBar({
    ...BAR_BASELINE,
    chartStyle: { legend: { position: "left" } },
  });
  const props = lastProps<LegendPropsHolder>(mantineBarChartMock);
  expect(props.legendProps).toEqual({
    verticalAlign: "middle",
    align: "left",
    layout: "vertical",
    width: 120,
  });
});

it("gives a right legend a vertical layout and its own width", () => {
  renderBar({
    ...BAR_BASELINE,
    chartStyle: { legend: { position: "right" } },
  });
  const props = lastProps<LegendPropsHolder>(mantineBarChartMock);
  expect(props.legendProps).toEqual({
    verticalAlign: "middle",
    align: "right",
    layout: "vertical",
    width: 120,
  });
});

it("leaves a horizontal legend without a width, so it keeps the full plot width", () => {
  renderBar({
    ...BAR_BASELINE,
    chartStyle: { legend: { position: "top" } },
  });
  const props = lastProps<LegendPropsHolder>(mantineBarChartMock);
  expect(props.legendProps?.layout).toBeUndefined();
  expect(props.legendProps?.width).toBeUndefined();
});

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
