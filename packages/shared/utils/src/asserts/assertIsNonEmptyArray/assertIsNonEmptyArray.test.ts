import { describe, expect, expectTypeOf, it } from "vitest";
import { assertIsNonEmptyArray } from "@utils/asserts/assertIsNonEmptyArray/assertIsNonEmptyArray.ts";

describe("assertIsNonEmptyArray", () => {
  it("does not throw for non-empty arrays", () => {
    expect(() => {
      return assertIsNonEmptyArray([1]);
    }).not.toThrow();
    expect(() => {
      return assertIsNonEmptyArray([1, 2, 3]);
    }).not.toThrow();
    expect(() => {
      return assertIsNonEmptyArray(["a", "b"]);
    }).not.toThrow();
    expect(() => {
      return assertIsNonEmptyArray([null]);
    }).not.toThrow();
  });

  it("throws for an empty array", () => {
    expect(() => {
      return assertIsNonEmptyArray([]);
    }).toThrow();
  });

  it("throws for null", () => {
    expect(() => {
      return assertIsNonEmptyArray(null);
    }).toThrow();
  });

  it("throws for undefined", () => {
    expect(() => {
      return assertIsNonEmptyArray(undefined);
    }).toThrow();
  });

  it("throws with default message", () => {
    expect(() => {
      return assertIsNonEmptyArray([]);
    }).toThrow("Expected value to be non-empty");
    expect(() => {
      return assertIsNonEmptyArray(null);
    }).toThrow("Expected value to be non-empty");
  });

  it("throws with custom message", () => {
    const msg = "items required";
    expect(() => {
      return assertIsNonEmptyArray([], msg);
    }).toThrow(msg);
    expect(() => {
      return assertIsNonEmptyArray(null, msg);
    }).toThrow(msg);
    expect(() => {
      return assertIsNonEmptyArray(undefined, msg);
    }).toThrow(msg);
  });

  it("throws an Error instance", () => {
    expect(() => {
      return assertIsNonEmptyArray([]);
    }).toThrow(Error);
  });

  describe("type narrowing", () => {
    it("narrows string[] to readonly [string, ...string[]]", () => {
      const value: string[] = ["a"];
      assertIsNonEmptyArray(value);
      expectTypeOf(value).toEqualTypeOf<
        string[] & readonly [string, ...string[]]
      >();
    });

    it("narrows number[] | null | undefined", () => {
      const value = [1, 2] as number[] | null | undefined;
      assertIsNonEmptyArray(value);
      expectTypeOf(value).toEqualTypeOf<
        number[] & readonly [number, ...number[]]
      >();
    });

    it("narrows readonly string[]", () => {
      const value: readonly string[] = ["x"];
      assertIsNonEmptyArray(value);
      expectTypeOf(value).toEqualTypeOf<readonly [string, ...string[]]>();
    });

    it("narrows readonly unknown[] | undefined", () => {
      const value: readonly unknown[] | undefined = [42];
      assertIsNonEmptyArray(value);
      expectTypeOf(value).toEqualTypeOf<readonly [unknown, ...unknown[]]>();
    });
  });
});
