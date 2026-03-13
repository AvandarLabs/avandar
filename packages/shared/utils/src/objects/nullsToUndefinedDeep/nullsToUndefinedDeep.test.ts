import { describe, expect, it } from "vitest";
import { nullsToUndefinedDeep } from "./nullsToUndefinedDeep.ts";

describe("nullsToUndefinedDeep", () => {
  it("swaps top-level null values to undefined", () => {
    const input = { a: 1, b: null, c: "hi" };

    const result = nullsToUndefinedDeep(input);

    expect(result).toEqual({
      a: 1,
      b: undefined,
      c: "hi",
    });
  });

  it("swaps nested null values to undefined", () => {
    const input = {
      a: 1,
      nested: { b: null, c: "keep" },
    };

    const result = nullsToUndefinedDeep(input);

    expect(result).toEqual({
      a: 1,
      nested: { b: undefined, c: "keep" },
    });
  });

  it("swaps deeply nested nulls across multiple levels", () => {
    const input = {
      level1: {
        level2: {
          level3: { keep: "yes", swap: null },
          also: null,
        },
        stays: 10,
      },
    };

    const result = nullsToUndefinedDeep(input);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: { keep: "yes", swap: undefined },
          also: undefined,
        },
        stays: 10,
      },
    });
  });

  it("swaps null values inside arrays", () => {
    const input = { items: [1, null, "hi", null] };

    const result = nullsToUndefinedDeep(input);

    expect(result).toEqual({
      items: [1, undefined, "hi", undefined],
    });
  });

  it("preserves existing undefined values", () => {
    const input = { a: undefined, b: null };

    const result = nullsToUndefinedDeep(input);

    expect(result).toEqual({
      a: undefined,
      b: undefined,
    });
  });

  it("returns a new object and does not mutate the input", () => {
    const input = { a: null, b: "keep" };
    const copy = { ...input };

    const result = nullsToUndefinedDeep(input);

    expect(result).not.toBe(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty object", () => {
    const result = nullsToUndefinedDeep({});

    expect(result).toEqual({});
  });
});
