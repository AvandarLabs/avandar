import { describe, expect, it } from "vitest";

import { normalizeLayerValue } from "./normalizeLayerValue";

describe("normalizeLayerValue", () => {
  it.each([
    [20, 4, 1, 5],
    [20, 4, 1_000, 5_000],
    [20, 4, 100_000, 500_000],
    [20, -4, 1_000, -5_000],
  ] as const)(
    "normalizes %s by %s with multiplier %s",
    (value, denominator, multiplier, expected) => {
      expect(normalizeLayerValue(value, denominator, multiplier)).toBe(
        expected,
      );
    },
  );

  it.each([null, undefined, 0, Number.NaN])(
    "returns no-data for denominator %s",
    (denominator) => {
      expect(normalizeLayerValue(20, denominator, 1_000)).toBeUndefined();
    },
  );

  it("returns no-data for a nonnumeric numerator", () => {
    expect(normalizeLayerValue("twenty", 4, 1)).toBeUndefined();
  });
});
