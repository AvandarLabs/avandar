import { describe, expect, it } from "vitest";
import { excludeUndefinedShallow } from "./excludeUndefinedShallow.ts";

describe("excludeUndefinedShallow", () => {
  it("removes top-level undefined values", () => {
    const input = { a: 1, b: undefined, c: "hi" };

    const result = excludeUndefinedShallow(input);

    expect(result).toEqual({ a: 1, c: "hi" });
  });

  it("preserves null values", () => {
    const input = { a: null, b: undefined, c: 0 };

    const result = excludeUndefinedShallow(input);

    expect(result).toEqual({ a: null, c: 0 });
  });

  it("does not recurse into nested objects", () => {
    const input = {
      a: 1,
      nested: { b: undefined, c: "keep" },
    };

    const result = excludeUndefinedShallow(input);

    expect(result).toEqual({
      a: 1,
      nested: { b: undefined, c: "keep" },
    });
  });

  it("removes all keys when all are undefined", () => {
    const input = {
      a: undefined,
      b: undefined,
      c: undefined,
    };

    const result = excludeUndefinedShallow(input);

    expect(result).toEqual({});
  });

  it("returns a new object and does not mutate the input", () => {
    const input = { a: undefined, b: "keep" };
    const copy = { ...input };

    const result = excludeUndefinedShallow(input);

    expect(result).not.toBe(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty object", () => {
    const result = excludeUndefinedShallow({});

    expect(result).toEqual({});
  });

  it("preserves values of different types", () => {
    const input = {
      str: "hello",
      num: 0,
      bool: false,
      nul: null,
      arr: [1, 2],
      obj: { nested: true },
      undef: undefined,
    };

    const result = excludeUndefinedShallow(input);

    expect(result).toEqual({
      str: "hello",
      num: 0,
      bool: false,
      nul: null,
      arr: [1, 2],
      obj: { nested: true },
    });
  });
});
