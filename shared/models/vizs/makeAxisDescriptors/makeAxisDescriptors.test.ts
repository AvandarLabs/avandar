import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";
import { describe, expect, it } from "vitest";

function keysOf(
  descriptors: ReadonlyArray<{ key: string }>,
): readonly string[] {
  return descriptors.map((d) => {
    return d.key;
  });
}

describe("makeAxisDescriptors", () => {
  it("emits only cosmetic settings for a category axis", () => {
    expect(keysOf(makeAxisDescriptors("xAxis", "category"))).toEqual([
      "chartStyle.xAxis.label",
      "chartStyle.xAxis.labelColor",
      "chartStyle.xAxis.tickColor",
      "chartStyle.xAxis.hide",
    ]);
  });

  it("adds the scale settings for a value axis", () => {
    expect(keysOf(makeAxisDescriptors("yAxis", "value"))).toEqual([
      "chartStyle.yAxis.label",
      "chartStyle.yAxis.labelColor",
      "chartStyle.yAxis.tickColor",
      "chartStyle.yAxis.hide",
      "chartStyle.yAxis.min",
      "chartStyle.yAxis.max",
      "chartStyle.yAxis.tickInterval",
    ]);
  });

  it("appends rotation last when requested", () => {
    const keys = keysOf(
      makeAxisDescriptors("xAxis", "category", { rotation: true }),
    );
    expect(keys.at(-1)).toBe("chartStyle.xAxis.tickAngle");
  });

  it("groups every descriptor under the axis name", () => {
    makeAxisDescriptors("yAxis", "value").forEach((descriptor) => {
      expect(descriptor.group).toBe("Y axis");
    });
    makeAxisDescriptors("xAxis", "category").forEach((descriptor) => {
      expect(descriptor.group).toBe("X axis");
    });
  });

  it("bounds the rotation control to a half turn", () => {
    const rotation = makeAxisDescriptors("xAxis", "category", {
      rotation: true,
    }).at(-1);
    expect(rotation?.control).toMatchObject({
      kind: "number",
      min: -90,
      max: 90,
    });
  });
});

describe("descriptor registries keep their existing field order", () => {
  it("bar still leads with layout, legend, then the axes and grid", () => {
    expect(keysOf(VizConfigs.getDescriptors("bar").chart)).toEqual([
      "layout",
      "withLegend",
      "chartStyle.legend.position",
      "chartStyle.xAxis.label",
      "chartStyle.xAxis.labelColor",
      "chartStyle.xAxis.tickColor",
      "chartStyle.xAxis.hide",
      "chartStyle.xAxis.tickAngle",
      "chartStyle.yAxis.label",
      "chartStyle.yAxis.labelColor",
      "chartStyle.yAxis.tickColor",
      "chartStyle.yAxis.hide",
      "chartStyle.yAxis.min",
      "chartStyle.yAxis.max",
      "chartStyle.yAxis.tickInterval",
      "chartStyle.grid.color",
      "chartStyle.grid.horizontal",
      "chartStyle.grid.vertical",
    ]);
  });

  it("line has the same shape without a layout setting", () => {
    const keys = keysOf(VizConfigs.getDescriptors("line").chart);
    expect(keys).not.toContain("layout");
    expect(keys).toContain("chartStyle.xAxis.tickAngle");
    expect(keys).toContain("chartStyle.yAxis.tickInterval");
  });

  it("area keeps its layout setting and gains the axis settings", () => {
    const keys = keysOf(VizConfigs.getDescriptors("area").chart);
    expect(keys).toContain("layout");
    expect(keys).toContain("chartStyle.xAxis.tickAngle");
    expect(keys).toContain("chartStyle.yAxis.min");
  });
});
