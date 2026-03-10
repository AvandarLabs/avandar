import { describe, expect, expectTypeOf, it } from "vitest";
import { assertIsSingletonArray } from "./assertIsSingletonArray.ts";

describe("assertIsSingletonArray", () => {
  it("does not throw for a singleton array", () => {
    expect(() => {
      return assertIsSingletonArray([1]);
    }).not.toThrow();
    expect(() => {
      return assertIsSingletonArray(["a"]);
    }).not.toThrow();
    expect(() => {
      return assertIsSingletonArray([null]);
    }).not.toThrow();
  });

  it("throws for an empty array", () => {
    expect(() => {
      return assertIsSingletonArray([]);
    }).toThrow();
  });

  it("throws for arrays with more than one element", () => {
    expect(() => {
      return assertIsSingletonArray([1, 2]);
    }).toThrow();
    expect(() => {
      return assertIsSingletonArray(["a", "b", "c"]);
    }).toThrow();
  });

  it("throws for null", () => {
    expect(() => {
      return assertIsSingletonArray(null);
    }).toThrow();
  });

  it("throws for undefined", () => {
    expect(() => {
      return assertIsSingletonArray(undefined);
    }).toThrow();
  });

  it("throws with default message", () => {
    expect(() => {
      return assertIsSingletonArray([]);
    }).toThrow("Expected value to be a singleton array");
  });

  it("throws with custom message", () => {
    const msg = "need exactly one item";
    expect(() => {
      return assertIsSingletonArray([], msg);
    }).toThrow(msg);
    expect(() => {
      return assertIsSingletonArray(null, msg);
    }).toThrow(msg);
    expect(() => {
      return assertIsSingletonArray([1, 2], msg);
    }).toThrow(msg);
  });

  it("throws an Error instance", () => {
    expect(() => {
      return assertIsSingletonArray([]);
    }).toThrow(Error);
  });

  describe("type narrowing", () => {
    it("narrows string[] to readonly [string]", () => {
      const value: string[] = ["a"];
      assertIsSingletonArray(value);
      expectTypeOf(value).toEqualTypeOf<string[] & readonly [string]>();
    });

    it("narrows number[] | null | undefined", () => {
      const value: number[] | null | undefined = [42];
      assertIsSingletonArray(value);
      expectTypeOf(value).toEqualTypeOf<number[] & readonly [number]>();
    });

    it("narrows readonly string[]", () => {
      const value: readonly string[] = ["x"];
      assertIsSingletonArray(value);
      expectTypeOf(value).toEqualTypeOf<readonly [string]>();
    });

    it("narrows readonly unknown[] | undefined", () => {
      const value: readonly unknown[] | undefined = [true];
      assertIsSingletonArray(value);
      expectTypeOf(value).toEqualTypeOf<readonly [unknown]>();
    });
  });
});
