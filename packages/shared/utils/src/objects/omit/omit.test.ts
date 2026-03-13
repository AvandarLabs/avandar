import { describe, expect, it } from "vitest";
import { omit } from "./omit.ts";

describe("omit", () => {
  describe("single key as string", () => {
    it("removes a single key", () => {
      const input = { a: 1, b: 2, c: 3 };

      const result = omit(input, "b");

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("returns all keys when the key does not exist", () => {
      const input = { a: 1, b: 2 };

      const result = omit(input, "c" as keyof typeof input);

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe("multiple keys as array", () => {
    it("removes multiple keys", () => {
      const input = { a: 1, b: 2, c: 3, d: 4 };

      const result = omit(input, ["b", "d"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("removes all keys when all are specified", () => {
      const input = { a: 1, b: 2 };

      const result = omit(input, ["a", "b"]);

      expect(result).toEqual({});
    });

    it("handles an empty keys array", () => {
      const input = { a: 1, b: 2 };

      const result = omit(input, []);

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe("immutability", () => {
    it("returns a new object", () => {
      const input = { a: 1, b: 2 };

      const result = omit(input, "a");

      expect(result).not.toBe(input);
    });

    it("does not mutate the original object", () => {
      const input = { a: 1, b: 2, c: 3 };
      const copy = { ...input };

      omit(input, ["a", "c"]);

      expect(input).toEqual(copy);
    });
  });

  describe("edge cases", () => {
    it("works with an empty object", () => {
      const input = {};

      const result = omit(input, []);

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

      const result = omit(input, ["str", "bool"]);

      expect(result).toEqual({
        num: 42,
        nul: null,
        undef: undefined,
        arr: [1, 2],
        obj: { nested: true },
      });
    });
  });
});
