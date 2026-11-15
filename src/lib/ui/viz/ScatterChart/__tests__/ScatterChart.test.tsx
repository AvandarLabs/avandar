import { ScatterChartTestFixtures } from "./ScatterChartTestFixtures";

const {
  expect,
  it,
  rechartsXAxisMock,
  rechartsYAxisMock,
  rechartsScatterMock,
  rechartsLegendMock,
  lastProps,
  _renderScatter,
} = ScatterChartTestFixtures;

it("bounds the X axis", () => {
  _renderScatter({ xAxis: { min: 0, max: 4, tickInterval: 1 } });
  const props = lastProps<{ domain?: unknown; ticks?: number[] }>(
    rechartsXAxisMock,
  );
  expect(props.domain).toEqual([0, 4]);
  expect(props.ticks).toEqual([0, 1, 2, 3, 4]);
});

it("bounds the Y axis", () => {
  _renderScatter({ yAxis: { min: 0, max: 40, tickInterval: 20 } });
  const props = lastProps<{ ticks?: number[] }>(rechartsYAxisMock);
  expect(props.ticks).toEqual([0, 20, 40]);
});

it("derives the X extent from the xKey column, not the Y column", () => {
  _renderScatter({ xAxis: { tickInterval: 1 } });
  const props = lastProps<{ domain?: unknown }>(rechartsXAxisMock);
  // `v` runs 1 to 3, so the derived domain is 0 to 3. Reading `w`
  // instead would give 0 to 5, which is what this case rules out.
  expect(props.domain).toEqual([0, 3]);
});

it("prefers a configured axis label over the derived column name", () => {
  _renderScatter({ xAxis: { label: "Spend" } });
  const props = lastProps<{ label?: { value?: string } }>(rechartsXAxisMock);
  expect(props.label?.value).toBe("Spend");
});

it("derives the axis label from the column when unset", () => {
  _renderScatter(undefined);
  const props = lastProps<{ label?: { value?: string } }>(rechartsXAxisMock);
  expect(props.label?.value).toBe("v");
});

it("gives each axis label its own color", () => {
  _renderScatter({
    xAxis: { label: "Spend", labelColor: "#ff0000" },
    yAxis: { label: "Revenue", labelColor: "#0000ff" },
  });
  const x = lastProps<{ label?: { value?: string; fill?: string } }>(
    rechartsXAxisMock,
  );
  const y = lastProps<{ label?: { value?: string; fill?: string } }>(
    rechartsYAxisMock,
  );
  // X and Y label colors must stay independent; the old Mantine path
  // collapsed both into a single shared styles.axisLabel fill.
  expect(x.label?.value).toBe("Spend");
  expect(x.label?.fill).toBe("#ff0000");
  expect(y.label?.value).toBe("Revenue");
  expect(y.label?.fill).toBe("#0000ff");
});

it("renders each series with its own color and label", () => {
  _renderScatter(undefined, [
    { key: "w", xKey: "v", label: "Alpha", color: "#123456" },
    { key: "v", xKey: "w", label: "Beta", color: "#abcdef" },
  ]);
  expect(rechartsScatterMock).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Alpha", fill: "#123456" }),
  );
  expect(rechartsScatterMock).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Beta", fill: "#abcdef" }),
  );
});

it("renders the legend even for a single series", () => {
  _renderScatter(undefined, [{ key: "w", xKey: "v" }]);
  expect(rechartsLegendMock).toHaveBeenCalled();
});

it("rotates X tick labels", () => {
  _renderScatter({ xAxis: { tickAngle: -90 } });
  const props = lastProps<{
    tick?: { angle?: number };
    interval?: number;
  }>(rechartsXAxisMock);
  expect(props.tick?.angle).toBe(-90);
  expect(props.interval).toBe(0);
});

it("adds no domain or ticks when nothing is configured", () => {
  _renderScatter(undefined);
  const props = lastProps<{ domain?: unknown; ticks?: unknown }>(
    rechartsXAxisMock,
  );
  expect(props.domain).toBeUndefined();
  expect(props.ticks).toBeUndefined();
});
