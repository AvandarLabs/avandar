import { describe, expect, it } from "vitest";
import { resolveTickRotation } from "@/lib/ui/viz/axis/resolveTickRotation/resolveTickRotation";

const LABELS = ["1/2014", "2/2014", "3/2014"];
const FONT_SIZE = 12;

describe("resolveTickRotation", () => {
  it("returns nothing for an undefined angle", () => {
    expect(
      resolveTickRotation({
        angle: undefined,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }),
    ).toEqual({});
  });

  it("returns nothing for a zero angle", () => {
    expect(
      resolveTickRotation({
        angle: 0,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }),
    ).toEqual({});
  });

  it("returns nothing for a non-finite angle", () => {
    expect(
      resolveTickRotation({
        angle: Number.NaN,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }),
    ).toEqual({});
  });

  it("anchors negative angles at the end of the label", () => {
    const result = resolveTickRotation({
      angle: -45,
      tickLabels: LABELS,
      fontSize: FONT_SIZE,
    });
    expect(result.tick).toEqual({ angle: -45, textAnchor: "end" });
  });

  it("anchors positive angles at the start of the label", () => {
    const result = resolveTickRotation({
      angle: 45,
      tickLabels: LABELS,
      fontSize: FONT_SIZE,
    });
    expect(result.tick).toEqual({ angle: 45, textAnchor: "start" });
  });

  it("clamps beyond ninety degrees", () => {
    expect(
      resolveTickRotation({
        angle: 200,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }).tick?.angle,
    ).toBe(90);
    expect(
      resolveTickRotation({
        angle: -200,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }).tick?.angle,
    ).toBe(-90);
  });

  it("forces every label to render", () => {
    expect(
      resolveTickRotation({
        angle: -90,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }).interval,
    ).toBe(0);
  });

  it("grows the axis height for longer labels", () => {
    // Both label lengths sit strictly inside the unclamped band (at 12px
    // and 90 degrees the floor saturates below ~3 chars and the ceiling
    // above ~22). Comparing two clamped values would pass even if the
    // growth term were deleted, so the bounds assertions keep this test
    // honest if the constants ever change.
    const short =
      resolveTickRotation({
        angle: -90,
        tickLabels: ["abc"],
        fontSize: FONT_SIZE,
      }).height ?? 0;
    const long =
      resolveTickRotation({
        angle: -90,
        tickLabels: ["abcdefghij"],
        fontSize: FONT_SIZE,
      }).height ?? 0;
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThan(30);
    expect(long).toBeLessThan(160);
  });

  it("never goes below the default axis height", () => {
    expect(
      resolveTickRotation({
        angle: -5,
        tickLabels: ["a"],
        fontSize: FONT_SIZE,
      }).height,
    ).toBe(30);
  });

  it("never exceeds the ceiling", () => {
    const label = "x".repeat(200);
    expect(
      resolveTickRotation({
        angle: -90,
        tickLabels: [label],
        fontSize: FONT_SIZE,
      }).height,
    ).toBe(160);
  });

  it("handles an empty label list without producing NaN", () => {
    const height = resolveTickRotation({
      angle: -90,
      tickLabels: [],
      fontSize: FONT_SIZE,
    }).height;
    expect(Number.isFinite(height)).toBe(true);
  });
});
