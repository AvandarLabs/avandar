import { prop } from "@avandar/utils";
import { describe, expect, it } from "vitest";

import { knownVizSettingControlLabels } from "$/copy/vizSettingControlLabel/vizSettingControlLabel.ts";
import { makeAxisDescriptors } from "$/models/vizs/makeAxisDescriptors/makeAxisDescriptors.ts";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs.ts";

function _keysOf(descriptors: ReadonlyArray<{ key: string }>): string[] {
  return descriptors.map(prop("key"));
}

describe("makeAxisDescriptors", () => {
  it("emits only cosmetic settings for a category axis", () => {
    expect(
      _keysOf(makeAxisDescriptors({ axis: "xAxis", role: "category" })),
    ).toEqual([
      "chartStyle.xAxis.label",
      "chartStyle.xAxis.labelColor",
      "chartStyle.xAxis.tickColor",
      "chartStyle.xAxis.hide",
    ]);
  });

  it("adds the scale settings for a value axis", () => {
    expect(
      _keysOf(makeAxisDescriptors({ axis: "yAxis", role: "value" })),
    ).toEqual([
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
    const keys = _keysOf(
      makeAxisDescriptors({
        axis: "xAxis",
        role: "category",
        rotation: true,
      }),
    );
    expect(keys.at(-1)).toBe("chartStyle.xAxis.tickAngle");
  });

  it("groups every descriptor under the axis name", () => {
    makeAxisDescriptors({ axis: "yAxis", role: "value" }).forEach(
      (descriptor) => {
        expect(descriptor.group).toBe("Y axis");
      },
    );
    makeAxisDescriptors({ axis: "xAxis", role: "category" }).forEach(
      (descriptor) => {
        expect(descriptor.group).toBe("X axis");
      },
    );
  });

  it("bounds the rotation control to a half turn", () => {
    const rotation = makeAxisDescriptors({
      axis: "xAxis",
      role: "category",
      rotation: true,
    }).at(-1);
    expect(rotation?.control).toMatchObject({
      kind: "number",
      min: -90,
      max: 90,
    });
  });

  it("catalogs every axis control label for translation", () => {
    const knownLabels = new Set(knownVizSettingControlLabels());
    const descriptors = [
      ...makeAxisDescriptors({
        axis: "xAxis",
        role: "value",
        rotation: true,
      }),
      ...makeAxisDescriptors({ axis: "yAxis", role: "value" }),
    ];

    expect(
      descriptors.map(prop("label")).filter((label) => {
        return !knownLabels.has(label);
      }),
    ).toEqual([]);
  });
});

describe("descriptor registry field order", () => {
  it("bar leads with layout, legend, then the axes and grid", () => {
    expect(_keysOf(VizConfigs.getDescriptors("bar").chart)).toEqual([
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
    const keys = _keysOf(VizConfigs.getDescriptors("line").chart);
    expect(keys).not.toContain("layout");
    expect(keys).toContain("chartStyle.xAxis.tickAngle");
    expect(keys).toContain("chartStyle.yAxis.tickInterval");
  });

  it("area keeps its layout setting and gains the axis settings", () => {
    const keys = _keysOf(VizConfigs.getDescriptors("area").chart);
    expect(keys).toContain("layout");
    expect(keys).toContain("chartStyle.xAxis.tickAngle");
    expect(keys).toContain("chartStyle.yAxis.min");
  });
});
