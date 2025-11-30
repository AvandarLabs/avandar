import { Expect } from "$/lib/types/testUtilityTypes.ts";
import { IsEqual } from "type-fest";
import { describe, expect, it } from "vitest";
import { isNonEmptyArray } from "./isNonEmptyArray.ts";

describe("isNonEmptyArray", () => {
  it("returns true for non-empty arrays", () => {
    expect(isNonEmptyArray([1, 2, 3])).toBe(true);
    expect(isNonEmptyArray(["a"])).toBe(true);
    expect(isNonEmptyArray([true, false])).toBe(true);
  });

  it("returns false for empty arrays", () => {
    expect(isNonEmptyArray([])).toBe(false);
  });

  it("returns false for null", () => {
    expect(isNonEmptyArray(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isNonEmptyArray(undefined)).toBe(false);
  });

  it("returns false for non-array values", () => {
    expect(isNonEmptyArray("string" as unknown as readonly unknown[])).toBe(
      false,
    );
    expect(isNonEmptyArray(123 as unknown as readonly unknown[])).toBe(false);
    expect(isNonEmptyArray({} as unknown as readonly unknown[])).toBe(false);
  });
});

// ============================================================================
// Type tests
// ============================================================================

const nonEmptyArray = [1, 2, 3] as number[];
const maybeFirstItem = nonEmptyArray[0];
const definitelyFirstItem = (() => {
  if (isNonEmptyArray(nonEmptyArray)) {
    return nonEmptyArray[0];
  }
  throw new Error();
})();

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  Expect<IsEqual<typeof maybeFirstItem, number | undefined>>,
  Expect<IsEqual<typeof definitelyFirstItem, number>>,
];
