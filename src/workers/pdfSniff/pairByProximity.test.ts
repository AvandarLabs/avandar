import { describe, expect, it } from "vitest";
import { pairByProximity } from "./pairByProximity";
import type { AssembledLabel, TextItem } from "./types";

function label(text: string, cx: number, cy: number): AssembledLabel {
  return {
    text,
    cx,
    cy,
    bbox: [cx - 20, cy - 4, cx + 20, cy + 4],
    items: [],
  };
}

function value(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: 12,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

describe("pairByProximity", () => {
  it("pairs each value with its nearest label", () => {
    const result = pairByProximity({
      values: [value("408", 490, 305)],
      labels: [label("KHARTOUM", 497, 302), label("KASSALA", 600, 400)],
    });

    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0]!.label).toBe("KHARTOUM");
    expect(result.pairs[0]!.value).toBe("408");
  });

  it("reports an ambiguity ratio for every pair", () => {
    const result = pairByProximity({
      values: [value("83", 480, 285)],
      labels: [label("RIVER NILE", 483, 283), label("RED SEA", 510, 254)],
    });

    // Best over runner-up. Near 1 means the two candidates are equally close.
    expect(result.pairs[0]!.ambiguityRatio).toBeGreaterThan(0);
    expect(result.pairs[0]!.ambiguityRatio).toBeLessThanOrEqual(1);
  });

  it("flags a pair whose runner-up is nearly as close", () => {
    // Regression from the design measurement: on the OCHA map, 83 sat almost
    // equidistant between RIVER NILE and RED SEA at a ratio of 0.94. The pair
    // happened to be right, but shipping it unflagged would have been luck.
    // The value sits between the two labels, 28 points from the winner and
    // 29.8 from the runner-up, which reproduces that 0.94.
    const result = pairByProximity({
      values: [value("83", 484, 285)],
      labels: [label("RIVER NILE", 462, 289), label("RED SEA", 519, 282)],
    });

    expect(result.pairs[0]!.isAmbiguous).toBe(true);
  });

  it("does not flag a pair with a clear winner", () => {
    const result = pairByProximity({
      values: [value("29", 428, 262)],
      labels: [label("NORTHERN", 427, 261), label("RED SEA", 700, 700)],
    });

    expect(result.pairs[0]!.isAmbiguous).toBe(false);
  });

  it("reports labels that matched no value", () => {
    // A state with no figure printed on it is information, not noise: the
    // reviewer needs to know we saw the label and found nothing for it.
    const result = pairByProximity({
      values: [value("408", 490, 305)],
      labels: [label("KHARTOUM", 497, 302), label("ABYEI", 100, 100)],
    });

    expect(result.unmatchedLabels).toEqual(["ABYEI"]);
  });

  it("reports values that matched no label", () => {
    const result = pairByProximity({
      values: [value("408", 490, 305)],
      labels: [],
    });

    expect(result.unmatchedValues).toEqual(["408"]);
    expect(result.pairs).toHaveLength(0);
  });

  it("never assigns one label to two values", () => {
    // Two figures next to one label means we have misread the graphic. Taking
    // the closer one and flagging the other is honest; silently overwriting
    // is not.
    const result = pairByProximity({
      values: [value("408", 490, 305), value("409", 492, 307)],
      labels: [label("KHARTOUM", 497, 302)],
    });

    expect(result.pairs).toHaveLength(1);
    expect(result.unmatchedValues).toEqual(["409"]);
  });

  it("respects a custom ambiguity threshold", () => {
    const strict = pairByProximity({
      values: [value("83", 480, 285)],
      labels: [label("A", 483, 283), label("B", 500, 300)],
      ambiguityThreshold: 0.1,
    });

    expect(strict.pairs[0]!.isAmbiguous).toBe(true);
  });

  it("returns nothing for empty input", () => {
    const result = pairByProximity({ values: [], labels: [] });

    expect(result.pairs).toHaveLength(0);
    expect(result.unmatchedLabels).toEqual([]);
  });
});
