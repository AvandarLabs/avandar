import { describe, expect, it } from "vitest";
import { makeSizeLegendStops } from "./makeSizeLegendStops";

describe("makeSizeLegendStops", () => {
  it("places the mid stop at a quarter of a sqrt span", () => {
    const stops = makeSizeLegendStops({
      values: [0, 100],
      minRadius: 4,
      maxRadius: 24,
      scale: "sqrt",
      formatLabel: String,
    });

    expect(stops).toEqual([
      { value: 0, radiusPx: 4, label: "0" },
      { value: 25, radiusPx: 14, label: "25" },
      { value: 100, radiusPx: 24, label: "100" },
    ]);
  });

  it("places the mid stop halfway through a linear span", () => {
    const stops = makeSizeLegendStops({
      values: [0, 100],
      minRadius: 4,
      maxRadius: 24,
      scale: "linear",
      formatLabel: String,
    });

    expect(stops).toEqual([
      { value: 0, radiusPx: 4, label: "0" },
      { value: 50, radiusPx: 14, label: "50" },
      { value: 100, radiusPx: 24, label: "100" },
    ]);
  });

  it("ignores non-finite values", () => {
    const stops = makeSizeLegendStops({
      values: [Number.NaN, 10, Number.POSITIVE_INFINITY, 30],
      minRadius: 2,
      maxRadius: 10,
      scale: "linear",
      formatLabel: String,
    });

    expect(stops).toEqual([
      { value: 10, radiusPx: 2, label: "10" },
      { value: 20, radiusPx: 6, label: "20" },
      { value: 30, radiusPx: 10, label: "30" },
    ]);
  });

  it("returns one stop when all finite values are equal", () => {
    expect(
      makeSizeLegendStops({
        values: [7, Number.NaN, 7],
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt",
        formatLabel: (value) => {
          return `value ${value}`;
        },
      }),
    ).toEqual([{ value: 7, radiusPx: 4, label: "value 7" }]);
  });

  it("returns no stops when no finite values exist", () => {
    expect(
      makeSizeLegendStops({
        values: [Number.NaN, Number.NEGATIVE_INFINITY],
        minRadius: 4,
        maxRadius: 24,
        scale: "sqrt",
        formatLabel: String,
      }),
    ).toEqual([]);
  });
});
