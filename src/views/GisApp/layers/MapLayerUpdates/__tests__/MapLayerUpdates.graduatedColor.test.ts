import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

function _createGraduatedLayer(
  overrides: Partial<GraduatedColor> = {},
): MapLayer.T {
  return {
    ...MapLayer.createArea("ZIP codes"),
    symbology: {
      ...MapLayer.createDefaultFillSymbology(),
      color: {
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
      },
    },
  };
}

function _getGraduatedColor(layer: MapLayer.T): GraduatedColor {
  if (
    layer.symbology.type === "heatmap" ||
    layer.symbology.color.type !== "graduated"
  ) {
    throw new Error("Expected a graduated color");
  }
  return layer.symbology.color;
}

describe("graduated color updates", () => {
  it("gives two manual classes the lightest and darkest preset colors", () => {
    const updated = MapLayerUpdates.withManualBreaks({
      layer: _createGraduatedLayer(),
      breaks: [95],
    });

    expect(_getGraduatedColor(updated).ramp).toEqual(["#eff3ff", "#08306b"]);
  });

  it("replaces only the edited class color", () => {
    const updated = MapLayerUpdates.withClassColor({
      layer: _createGraduatedLayer(),
      classIndex: 1,
      color: "#d7301f",
    });

    expect(_getGraduatedColor(updated).ramp).toEqual([
      "#eff3ff",
      "#d7301f",
      "#08306b",
    ]);
  });

  it("stores a typed class label on its class", () => {
    const updated = MapLayerUpdates.withClassLabel({
      layer: _createGraduatedLayer(),
      classIndex: 0,
      label: "Lowest",
    });

    expect(_getGraduatedColor(updated).classLabels).toEqual([
      "Lowest",
      "Middle",
      undefined,
    ]);
  });

  it("unsets a class label typed as blank", () => {
    const updated = MapLayerUpdates.withClassLabel({
      layer: _createGraduatedLayer(),
      classIndex: 1,
      label: "  ",
    });

    expect(_getGraduatedColor(updated).classLabels).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("fills every class from a picked preset", () => {
    const updated = MapLayerUpdates.withRampPreset({
      layer: _createGraduatedLayer(),
      presetKey: "red",
    });

    expect(_getGraduatedColor(updated).ramp).toEqual([
      "#fee5d9",
      "#fb6a4a",
      "#a50f15",
    ]);
  });

  it("reverses the class colors", () => {
    const updated = MapLayerUpdates.withReversedRamp(_createGraduatedLayer());

    expect(_getGraduatedColor(updated).ramp).toEqual([
      "#08306b",
      "#6baed6",
      "#eff3ff",
    ]);
  });

  it("highlights values below one break with threshold colors and labels", () => {
    const updated = MapLayerUpdates.withHighlightBelow({
      layer: _createGraduatedLayer(),
      breakValue: 0.95,
      belowLabel: "Below 95%",
      aboveLabel: "95% or above",
    });

    expect(_getGraduatedColor(updated)).toMatchObject({
      classification: { method: "manual", breaks: [0.95] },
      ramp: ["#d7301f", "#d9d9d9"],
      classLabels: ["Below 95%", "95% or above"],
    });
  });

  it("leaves a single-color layer unchanged", () => {
    const layer = MapLayer.createArea("ZIP codes");

    expect(
      MapLayerUpdates.withClassColor({ layer, classIndex: 0, color: "#000" }),
    ).toBe(layer);
  });
});
