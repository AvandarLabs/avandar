import { describe, expect, it } from "vitest";
import { undefinedsToNullsDeep } from "./undefinedsToNullsDeep.ts";

describe("undefinedsToNullsDeep", () => {
  it("swaps top-level undefined values to null", () => {
    const input = { a: 1, b: undefined, c: "hi" };

    const result = undefinedsToNullsDeep(input);

    expect(result).toEqual({
      a: 1,
      b: null,
      c: "hi",
    });
  });

  it("swaps nested undefined values to null", () => {
    const input = {
      a: 1,
      nested: { b: undefined, c: "keep" },
    };

    const result = undefinedsToNullsDeep(input);

    expect(result).toEqual({
      a: 1,
      nested: { b: null, c: "keep" },
    });
  });

  it("swaps deeply nested undefineds across multiple levels", () => {
    const input = {
      level1: {
        level2: {
          level3: { keep: "yes", swap: undefined },
          also: undefined,
        },
        stays: 10,
      },
    };

    const result = undefinedsToNullsDeep(input);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: { keep: "yes", swap: null },
          also: null,
        },
        stays: 10,
      },
    });
  });

  it("swaps undefined values inside arrays", () => {
    const input = {
      items: [1, undefined, "hi", undefined],
    };

    const result = undefinedsToNullsDeep(input);

    expect(result).toEqual({
      items: [1, null, "hi", null],
    });
  });

  it("preserves existing null values", () => {
    const input = { a: null, b: undefined };

    const result = undefinedsToNullsDeep(input);

    expect(result).toEqual({ a: null, b: null });
  });

  it("returns a new object and does not mutate the input", () => {
    const input = { a: undefined, b: "keep" };
    const copy = { ...input };

    const result = undefinedsToNullsDeep(input);

    expect(result).not.toBe(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty object", () => {
    const result = undefinedsToNullsDeep({});

    expect(result).toEqual({});
  });
});
