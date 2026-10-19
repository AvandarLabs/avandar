import { LineChartTestFixtures } from "./LineChartTestFixtures";
const {
  expect,
  it,
  mantineLineChartMock,
  lastProps,
  renderLine,
  LINE_BASELINE,
} = LineChartTestFixtures;

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
