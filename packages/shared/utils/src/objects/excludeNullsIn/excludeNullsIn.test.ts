import { describe, expect, it } from "vitest";
import { excludeNullsIn } from "@utils/objects/excludeNullsIn/excludeNullsIn.ts";

describe("excludeNullsIn", () => {
  describe("single key as string", () => {
    it("removes a null value for the specified key", () => {
      const input = { a: 1, b: null, c: "hi" };

      const result = excludeNullsIn(input, "b");

      expect(result).toEqual({ a: 1, c: "hi" });
    });

    it("keeps a non-null value for the specified key", () => {
      const input = { a: 1, b: "hello", c: null };

      const result = excludeNullsIn(input, "b");

      expect(result).toEqual({
        a: 1,
        b: "hello",
        c: null,
      });
    });
  });

  describe("multiple keys as array", () => {
    it("removes null values for the specified keys", () => {
      const input = {
        a: 1,
        b: null,
        c: null,
        d: "keep",
      };

      const result = excludeNullsIn(input, ["b", "c"]);

      expect(result).toEqual({ a: 1, d: "keep" });
    });

    it("only removes nulls from specified keys", () => {
      const input = {
        a: null,
        b: null,
        c: null,
      };

      const result = excludeNullsIn(input, ["a", "c"]);

      expect(result).toEqual({ b: null });
    });

    it("excludes nulls from all keys when given an empty array", () => {
      const input = {
        a: null,
        b: 2,
        c: null,
        d: "keep",
      };

      const result = excludeNullsIn(input, []);

      expect(result).toEqual({ b: 2, d: "keep" });
    });
  });

  describe("immutability", () => {
    it("returns a new object", () => {
      const input = { a: null, b: 2 };

      const result = excludeNullsIn(input, "a");

      expect(result).not.toBe(input);
    });

    it("does not mutate the original object", () => {
      const input = { a: null, b: 2, c: null };
      const copy = { ...input };

      excludeNullsIn(input, ["a", "c"]);

      expect(input).toEqual(copy);
    });
  });

  describe("edge cases", () => {
    it("preserves undefined values", () => {
      const input = {
        a: undefined,
        b: null,
        c: "hi",
      };

      const result = excludeNullsIn(input, ["a", "b"]);

      expect(result).toEqual({
        a: undefined,
        c: "hi",
      });
    });

    it("works with an object that has no nulls", () => {
      const input = { a: 1, b: "hello", c: true };

      const result = excludeNullsIn(input, ["a", "b"]);

      expect(result).toEqual({
        a: 1,
        b: "hello",
        c: true,
      });
    });
  });
});
