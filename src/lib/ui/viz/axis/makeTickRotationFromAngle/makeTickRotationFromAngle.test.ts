import { describe, expect, it } from "vitest";

import { makeTickRotationFromAngle } from "@/lib/ui/viz/axis/makeTickRotationFromAngle/makeTickRotationFromAngle";

const LABELS = ["1/2014", "2/2014", "3/2014"];
const FONT_SIZE = 12;

describe("makeTickRotationFromAngle", () => {
  it("returns nothing for an undefined angle", () => {
    expect(
      makeTickRotationFromAngle({
        angle: undefined,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }),
    ).toEqual({});
  });

  it("returns nothing for a zero angle", () => {
    expect(
      makeTickRotationFromAngle({
        angle: 0,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }),
    ).toEqual({});
  });

  it("returns nothing for a non-finite angle", () => {
    expect(
      makeTickRotationFromAngle({
        angle: Number.NaN,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }),
    ).toEqual({});
  });

  it("anchors negative angles at the end of the label", () => {
    const result = makeTickRotationFromAngle({
      angle: -45,
      tickLabels: LABELS,
      fontSize: FONT_SIZE,
    });
    expect(result.tick).toEqual({ angle: -45, textAnchor: "end" });
  });

  it("anchors positive angles at the start of the label", () => {
    const result = makeTickRotationFromAngle({
      angle: 45,
      tickLabels: LABELS,
      fontSize: FONT_SIZE,
    });
    expect(result.tick).toEqual({ angle: 45, textAnchor: "start" });
  });

  it("clamps beyond ninety degrees", () => {
    expect(
      makeTickRotationFromAngle({
        angle: 200,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }).tick?.angle,
    ).toBe(90);
    expect(
      makeTickRotationFromAngle({
        angle: -200,
        tickLabels: LABELS,
        fontSize: FONT_SIZE,
      }).tick?.angle,
    ).toBe(-90);
  });

  it("forces every label to render", () => {
    expect(
      makeTickRotationFromAngle({
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
      makeTickRotationFromAngle({
        angle: -90,
        tickLabels: ["abc"],
        fontSize: FONT_SIZE,
      }).height ?? 0;
    const long =
      makeTickRotationFromAngle({
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
      makeTickRotationFromAngle({
        angle: -5,
        tickLabels: ["a"],
        fontSize: FONT_SIZE,
      }).height,
    ).toBe(30);
  });

  it("never exceeds the ceiling", () => {
    const label = "x".repeat(200);
    expect(
      makeTickRotationFromAngle({
        angle: -90,
        tickLabels: [label],
        fontSize: FONT_SIZE,
      }).height,
    ).toBe(160);
  });

  it("handles an empty label list without producing NaN", () => {
    const height = makeTickRotationFromAngle({
      angle: -90,
      tickLabels: [],
      fontSize: FONT_SIZE,
    }).height;
    expect(Number.isFinite(height)).toBe(true);
  });
});
