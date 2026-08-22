import { describe, expect, it } from "vitest";
import { classifyLayerValues } from "./classifyLayerValues";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

const ramp = ["#fee", "#fcc", "#f99", "#f66", "#f00"];
const noData = { color: "#ccc", label: "" };

function _classify(
  values: readonly unknown[],
  classification: MapLayer.Classification,
) {
  return classifyLayerValues(
    values.map((value, index) => {
      return { featureId: String(index), value };
    }),
    { classification, ramp, noData },
  );
}

describe("classifyLayerValues", () => {
  it.each([
    ["quantile", [3, 5]],
    ["equalInterval", [2.666666666666667, 4.333333333333334]],
    ["jenks", [3, 5]],
  ] as const)("classifies values with %s", (method, expectedCuts) => {
    const result = _classify([1, 2, 3, 4, 5, 6], {
      method,
      classCount: 3,
    });

    const upperBreaks = result.breaks.slice(0, -1).map(({ upper }) => {
      return upper;
    });
    expect(upperBreaks).toEqual(expectedCuts);
    expect(result.classIndexByFeatureId.size).toBe(6);
    expect(result.recommendation).toBe("classified");
  });

  it("uses exact manual cuts and handles negative values", () => {
    const result = _classify([-10, -5, 0, 5], {
      method: "manual",
      breaks: [-4, 2],
    });

    expect(result.breaks).toEqual([
      { lower: undefined, upper: -4 },
      { lower: -4, upper: 2 },
      { lower: 2, upper: undefined },
    ]);
    expect([...result.classIndexByFeatureId.values()]).toEqual([0, 0, 1, 2]);
  });

  it("does not split duplicate values between quantile classes", () => {
    const result = _classify([1, 1, 1, 1, 2, 3], {
      method: "quantile",
      classCount: 3,
    });

    const duplicateClasses = [0, 1, 2, 3].map((id) => {
      return result.classIndexByFeatureId.get(String(id));
    });
    expect(new Set(duplicateClasses).size).toBe(1);
  });

  it("clamps classes to distinct values", () => {
    const result = _classify([1, 1, 2, 2], {
      method: "equalInterval",
      classCount: 5,
    });

    expect(result.breaks).toHaveLength(2);
    expect(result.distinctValueCount).toBe(2);
  });

  it("recommends a single color for one unique value", () => {
    const result = _classify([4, 4, 4], {
      method: "standardDeviation",
      classCount: 5,
    });

    expect(result.recommendation).toBe("singleColor");
    expect(result.breaks).toHaveLength(1);
  });

  it("keeps null and nonnumeric values as no-data", () => {
    const result = _classify([null, "bad", 1, Number.NaN], {
      method: "quantile",
      classCount: 3,
    });

    expect(result.sourceValueCount).toBe(4);
    expect(result.classifiedValueCount).toBe(1);
    expect(result.entries.at(-1)).toMatchObject({ type: "noData", count: 3 });
  });

  it("returns only no-data for empty and all-null input", () => {
    expect(
      _classify([null, undefined], { method: "quantile", classCount: 3 }),
    ).toMatchObject({ recommendation: "noData", classifiedValueCount: 0 });
    expect(_classify([], { method: "quantile", classCount: 3 })).toMatchObject({
      recommendation: "noData",
      sourceValueCount: 0,
    });
  });
});
