import { describe, expect, it } from "vitest";
import { excludeNullsExceptIn } from "@utils/objects/excludeNullsExceptIn/excludeNullsExceptIn.ts";

describe("excludeNullsExceptIn", () => {
  describe("single key as string", () => {
    it("keeps null for the specified key and removes other nulls", () => {
      const input = {
        a: null,
        b: null,
        c: "keep",
      };

      const result = excludeNullsExceptIn(input, "a");

      expect(result).toEqual({ a: null, c: "keep" });
    });

    it("preserves non-null values everywhere", () => {
      const input = { a: 1, b: null, c: "hi" };

      const result = excludeNullsExceptIn(input, "a");

      expect(result).toEqual({ a: 1, c: "hi" });
    });
  });

  describe("multiple keys as array", () => {
    it("keeps null for specified keys and removes others", () => {
      const input = {
        a: null,
        b: null,
        c: null,
        d: "keep",
      };

      const result = excludeNullsExceptIn(input, ["a", "b"]);

      expect(result).toEqual({
        a: null,
        b: null,
        d: "keep",
      });
    });

    it("returns the object unchanged when given an empty array", () => {
      const input = {
        a: null,
        b: 2,
        c: null,
      };

      const result = excludeNullsExceptIn(input, []);

      expect(result).toEqual({
        a: null,
        b: 2,
        c: null,
      });
    });

    it("removes all nulls when no keys match", () => {
      const input = {
        a: null,
        b: 2,
        c: null,
        d: "hi",
      };

      const result = excludeNullsExceptIn(input, ["b", "d"]);

      expect(result).toEqual({ b: 2, d: "hi" });
    });
  });

  describe("immutability", () => {
    it("returns a new object", () => {
      const input = { a: null, b: 2 };

      const result = excludeNullsExceptIn(input, "a");

      expect(result).not.toBe(input);
    });

    it("does not mutate the original object", () => {
      const input = { a: null, b: 2, c: null };
      const copy = { ...input };

      excludeNullsExceptIn(input, "a");

      expect(input).toEqual(copy);
    });
  });

  describe("edge cases", () => {
    it("preserves undefined values", () => {
      const input = {
        a: undefined,
        b: null,
        c: null,
      };

      const result = excludeNullsExceptIn(input, "b");

      expect(result).toEqual({
        a: undefined,
        b: null,
      });
    });

    it("works with an object that has no nulls", () => {
      const input = { a: 1, b: "hello", c: true };

      const result = excludeNullsExceptIn(input, "a");

      expect(result).toEqual({
        a: 1,
        b: "hello",
        c: true,
      });
    });
  });
});
