import { describe, expect, it } from "vitest";
import { applyChartStyle } from "@/lib/ui/viz/applyChartStyle/applyChartStyle";

describe("applyChartStyle — no axis scale settings", () => {
  it("passes no domain or ticks when nothing is configured", () => {
    const result = applyChartStyle(undefined, {
      yExtent: { min: 0, max: 100 },
    });
    expect(result.yAxisProps?.domain).toBeUndefined();
    expect(result.yAxisProps?.ticks).toBeUndefined();
  });

  it("passes no tick object when no tick setting is configured", () => {
    const result = applyChartStyle({ xAxis: { label: "Month" } });
    expect(result.xAxisProps?.tick).toBeUndefined();
  });
});

describe("applyChartStyle — tick defaults merge", () => {
  it("keeps the theme-following fill when only an angle is set", () => {
    const result = applyChartStyle(
      { xAxis: { tickAngle: -90 } },
      { xTickLabels: ["1/2014"] },
    );
    expect(result.xAxisProps?.tick).toMatchObject({
      fill: "currentColor",
      fontSize: 12,
      angle: -90,
      textAnchor: "end",
    });
  });

  it("lets an explicit tick color win over the default fill", () => {
    const result = applyChartStyle({ xAxis: { tickColor: "#00ff00" } });
    expect(result.xAxisProps?.tick).toMatchObject({
      fill: "#00ff00",
      fontSize: 12,
    });
  });
});

describe("applyChartStyle — axis roles gate the value settings", () => {
  it("resolves a value Y axis", () => {
    const result = applyChartStyle(
      { yAxis: { min: 0, max: 100, tickInterval: 25 } },
      {
        yExtent: { min: 0, max: 100 },
        axisRoles: { x: "category", y: "value" },
      },
    );
    expect(result.yAxisProps?.domain).toEqual([0, 100]);
    expect(result.yAxisProps?.ticks).toEqual([0, 25, 50, 75, 100]);
  });

  it("ignores value settings on a category X axis", () => {
    const result = applyChartStyle(
      { xAxis: { min: 0, max: 100 } },
      {
        xExtent: { min: 0, max: 100 },
        axisRoles: { x: "category", y: "value" },
      },
    );
    expect(result.xAxisProps?.domain).toBeUndefined();
  });

  it("resolves a value X axis for scatter-style charts", () => {
    const result = applyChartStyle(
      { xAxis: { min: 0, max: 100 } },
      { xExtent: { min: 0, max: 100 }, axisRoles: { x: "value", y: "value" } },
    );
    expect(result.xAxisProps?.domain).toEqual([0, 100]);
  });
});

describe("applyChartStyle — rotation", () => {
  it("forces every label and grows the axis when rotated", () => {
    const result = applyChartStyle(
      { xAxis: { tickAngle: -90 } },
      { xTickLabels: ["1/2014", "2/2014"] },
    );
    expect(result.xAxisProps?.interval).toBe(0);
    expect(result.xAxisProps?.height).toBeGreaterThan(30);
  });

  it("leaves interval and height alone when unrotated", () => {
    const result = applyChartStyle({ xAxis: { label: "Month" } });
    expect(result.xAxisProps?.interval).toBeUndefined();
    expect(result.xAxisProps?.height).toBeUndefined();
  });
});

describe("applyChartStyle — existing behavior is preserved", () => {
  it("still layers baseXAxisProps underneath", () => {
    const padding = { left: 30, right: 30 };
    const result = applyChartStyle(undefined, {
      baseXAxisProps: { padding },
    });
    expect(result.xAxisProps?.padding).toEqual(padding);
  });

  it("still maps hide to withXAxis and withYAxis", () => {
    const result = applyChartStyle({
      xAxis: { hide: true },
      yAxis: { hide: true },
    });
    expect(result.withXAxis).toBe(false);
    expect(result.withYAxis).toBe(false);
  });
});
