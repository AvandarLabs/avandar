import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

const BLUE_RAMP = ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"];

function _createColor(overrides: Partial<GraduatedColor>): GraduatedColor {
  return {
    type: "graduated",
    value: {
      type: "areaAggregation",
      outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
    },
    ramp: ["#eff3ff", "#6baed6", "#08306b"],
    classification: { method: "quantile", classCount: 3 },
    normalization: undefined,
    noData: { color: "#ced4da", label: "" },
    classLabels: [undefined, "Middle", undefined],
    ...overrides,
  };
}

describe("GraduatedRamps.findPreset", () => {
  it("names the preset a two-class ramp was resampled from", () => {
    expect(GraduatedRamps.findPreset(["#fee5d9", "#a50f15"])).toEqual({
      key: "red",
      isReversed: false,
    });
  });

  it("names a reversed preset as reversed", () => {
    expect(
      GraduatedRamps.findPreset(["#08306b", "#6baed6", "#eff3ff"]),
    ).toEqual({ key: "blue", isReversed: true });
  });

  it("finds no preset once a class color was edited", () => {
    expect(
      GraduatedRamps.findPreset(["#d7301f", "#6baed6", "#08306b"]),
    ).toBeUndefined();
  });
});

describe("GraduatedRamps.fitColorToClassCount", () => {
  it("returns the same color when the ramp and labels already fit", () => {
    const color = _createColor({});

    expect(GraduatedRamps.fitColorToClassCount(color)).toBe(color);
  });

  it("resamples the whole preset when the class count grows", () => {
    const color = _createColor({
      classification: { method: "quantile", classCount: 5 },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).ramp).toEqual(
      BLUE_RAMP,
    );
  });

  it("resamples a reversed preset in reverse", () => {
    const color = _createColor({
      ramp: ["#08306b", "#6baed6", "#eff3ff"],
      classification: { method: "quantile", classCount: 5 },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).ramp).toEqual(
      BLUE_RAMP.toReversed(),
    );
  });

  it("resamples hand-edited colors when the class count shrinks", () => {
    const color = _createColor({
      ramp: ["#111111", "#222222", "#333333"],
      classification: { method: "manual", breaks: [95] },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).ramp).toEqual([
      "#111111",
      "#333333",
    ]);
  });

  it("resets every class label when the class count changes", () => {
    const color = _createColor({
      classification: { method: "manual", breaks: [95] },
    });

    expect(GraduatedRamps.fitColorToClassCount(color).classLabels).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("gives a new graduated color one unset label per class", () => {
    const color = _createColor({
      ramp: BLUE_RAMP,
      classification: { method: "quantile", classCount: 5 },
      classLabels: [],
    });

    expect(GraduatedRamps.fitColorToClassCount(color)).toMatchObject({
      ramp: BLUE_RAMP,
      classLabels: [undefined, undefined, undefined, undefined, undefined],
    });
  });
});
