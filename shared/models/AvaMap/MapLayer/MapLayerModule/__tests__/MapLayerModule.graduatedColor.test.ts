import { describe, expect, it } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";

const BLUE_RAMP = [
  "#eff3ff",
  "#bdd7e7",
  "#6baed6",
  "#2171b5",
  "#08306b",
] as const;

describe("MapLayer.resampleColorRamp", () => {
  it("gives two classes the lightest and darkest colors", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 2)).toEqual([
      "#eff3ff",
      "#08306b",
    ]);
  });

  it("gives three classes the first, middle, and last colors", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 3)).toEqual([
      "#eff3ff",
      "#6baed6",
      "#08306b",
    ]);
  });

  it("keeps a five-color ramp unchanged for five classes", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 5)).toEqual([...BLUE_RAMP]);
  });

  it("blends neighboring colors for seven classes", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 7)).toEqual([
      "#eff3ff",
      "#cee0ef",
      "#a2c9e1",
      "#6baed6",
      "#3a85c0",
      "#195b9c",
      "#08306b",
    ]);
  });

  it("blends between stops when four classes fall between them", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 4)).toEqual([
      "#eff3ff",
      "#a2c9e1",
      "#3a85c0",
      "#08306b",
    ]);
  });

  it("takes the nearer stop when a color is not hex", () => {
    expect(MapLayer.resampleColorRamp(["red", "blue"], 3)).toEqual([
      "red",
      "blue",
      "blue",
    ]);
  });

  it("returns no colors for zero classes", () => {
    expect(MapLayer.resampleColorRamp(BLUE_RAMP, 0)).toEqual([]);
  });
});

describe("MapLayer.getGraduatedClassCount", () => {
  it("counts one more class than manual breaks", () => {
    expect(
      MapLayer.getGraduatedClassCount({ method: "manual", breaks: [95] }),
    ).toBe(2);
  });

  it("reads the class count of an automatic method", () => {
    expect(
      MapLayer.getGraduatedClassCount({ method: "jenks", classCount: 4 }),
    ).toBe(4);
  });
});
