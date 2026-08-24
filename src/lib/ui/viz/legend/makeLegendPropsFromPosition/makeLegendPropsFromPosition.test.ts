/**
 * The legend position mapping, shared by the cartesian charts (through
 * `applyChartStyle`) and by radar. Kept as a pure unit test because the
 * side positions turn on `layout` and `width`, which is what Recharts
 * needs to reserve plot space rather than collapse the plot to nothing.
 */
import { describe, expect, it } from "vitest";
import { makeLegendPropsFromPosition } from "@/lib/ui/viz/legend/makeLegendPropsFromPosition/makeLegendPropsFromPosition";

describe("makeLegendPropsFromPosition", () => {
  it("centers a top legend above the plot", () => {
    expect(makeLegendPropsFromPosition("top")).toEqual({
      verticalAlign: "top",
      align: "center",
    });
  });

  it("centers a bottom legend below the plot", () => {
    expect(makeLegendPropsFromPosition("bottom")).toEqual({
      verticalAlign: "bottom",
      align: "center",
    });
  });

  it("defaults to top when no position is configured", () => {
    expect(makeLegendPropsFromPosition(undefined)).toEqual({
      verticalAlign: "top",
      align: "center",
    });
  });

  it("gives a left legend a vertical layout and its own width", () => {
    expect(makeLegendPropsFromPosition("left")).toEqual({
      verticalAlign: "middle",
      align: "left",
      layout: "vertical",
      width: 120,
    });
  });

  it("gives a right legend a vertical layout and its own width", () => {
    expect(makeLegendPropsFromPosition("right")).toEqual({
      verticalAlign: "middle",
      align: "right",
      layout: "vertical",
      width: 120,
    });
  });
});
