/**
 * Closed-ring validity: closed, no consecutive duplicates, no crossings.
 */
import { describe, expect, it } from "vitest";
import { isClosedRingValid } from "@/views/GisApp/tools/isClosedRingValid/isClosedRingValid";

const UNIT_SQUARE: ReadonlyArray<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];

const UNCLOSED_TRIANGLE: ReadonlyArray<[number, number]> = [
  [0, 0],
  [1, 0],
  [0.5, 1],
];

const BOWTIE: ReadonlyArray<[number, number]> = [
  [0, 0],
  [1, 1],
  [1, 0],
  [0, 1],
  [0, 0],
];

describe("isClosedRingValid", () => {
  it("accepts a closed unit square", () => {
    expect(isClosedRingValid(UNIT_SQUARE)).toBe(true);
  });

  it("rejects an unclosed triangle", () => {
    expect(isClosedRingValid(UNCLOSED_TRIANGLE)).toBe(false);
  });

  it("rejects a self-intersecting bowtie", () => {
    expect(isClosedRingValid(BOWTIE)).toBe(false);
  });
});
