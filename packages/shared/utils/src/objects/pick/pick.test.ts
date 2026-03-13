import { describe, expect, it } from "vitest";
import { pick } from "./pick.ts";

describe("pick", () => {
  describe("single key as string", () => {
    it("picks a single key", () => {
      const input = { a: 1, b: 2, c: 3 };

      const result = pick(input, "b");

      expect(result).toEqual({ b: 2 });
    });

    it("returns an empty value when the key does not exist", () => {
      const input = { a: 1, b: 2 };

      const result = pick(input, "c" as keyof typeof input);

      expect(result).toEqual({ c: undefined });
    });
  });

  describe("multiple keys as array", () => {
    it("picks multiple keys", () => {
      const input = { a: 1, b: 2, c: 3, d: 4 };

      const result = pick(input, ["a", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("picks all keys when all are specified", () => {
      const input = { a: 1, b: 2 };

      const result = pick(input, ["a", "b"]);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it("handles an empty keys array", () => {
      const input = { a: 1, b: 2 };

      const result = pick(input, []);

      expect(result).toEqual({});
    });
  });

  describe("immutability", () => {
    it("returns a new object", () => {
      const input = { a: 1, b: 2 };

      const result = pick(input, "a");

      expect(result).not.toBe(input);
    });

    it("does not mutate the original object", () => {
      const input = { a: 1, b: 2, c: 3 };
      const copy = { ...input };

      pick(input, ["a"]);

      expect(input).toEqual(copy);
    });
  });

  describe("edge cases", () => {
    it("works with an empty object", () => {
      const input = {};

      const result = pick(input, []);

      expect(result).toEqual({});
    });

    it("preserves values of different types", () => {
      const input = {
        str: "hello",
        num: 42,
        bool: true,
        nul: null,
        undef: undefined,
        arr: [1, 2],
        obj: { nested: true },
      };

      const result = pick(input, ["num", "arr", "obj"]);

      expect(result).toEqual({
        num: 42,
        arr: [1, 2],
        obj: { nested: true },
      });
    });
  });
});
