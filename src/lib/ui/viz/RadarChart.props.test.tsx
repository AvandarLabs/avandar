import { RadarChartTestFixtures } from "./RadarChartTestFixtures";
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
  mantineRadarChartMock,
  lastProps,
  renderRadar,
  RADAR_BASELINE,
} = RadarChartTestFixtures;

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

// Radar has no cartesian axes, so it cannot use `applyChartStyle`, but
// it shares the legend mapping and must place a side legend identically.
it("gives a side legend the same vertical layout as the cartesian charts", () => {
  renderRadar({
    ...RADAR_BASELINE,
    chartStyle: { legend: { position: "left" } },
  });
  expect(
    lastProps<LegendPropsHolder>(mantineRadarChartMock).legendProps,
  ).toEqual({
    verticalAlign: "middle",
    align: "left",
    layout: "vertical",
    width: 120,
  });
});

it("maps legend.position bottom without reserving a width", () => {
  renderRadar({
    ...RADAR_BASELINE,
    chartStyle: { legend: { position: "bottom" } },
  });
  const props = lastProps<LegendPropsHolder>(mantineRadarChartMock);
  expect(props.legendProps?.verticalAlign).toBe("bottom");
  expect(props.legendProps?.width).toBeUndefined();
});
