import { describe, expect, it } from "vitest";
import { isEpochMs } from "./isEpochMs.ts";

describe("isEpochMs", () => {
  it("accepts millisecond epoch values", () => {
    expect(isEpochMs(1_705_813_200_000)).toBe(true);
  });

  it("rejects small integers", () => {
    expect(isEpochMs(1_000_000)).toBe(false);
    expect(isEpochMs(999_999_999_999)).toBe(false);
  });

  it("rejects non-number inputs", () => {
    expect(isEpochMs("1705813200000")).toBe(false);
    expect(isEpochMs(null)).toBe(false);
  });
});
