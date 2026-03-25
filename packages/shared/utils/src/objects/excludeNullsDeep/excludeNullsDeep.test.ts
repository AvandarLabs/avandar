import { describe, expect, it } from "vitest";
import { excludeNullsDeep } from "@utils/objects/excludeNullsDeep/excludeNullsDeep.ts";

describe("excludeNullsDeep", () => {
  describe("primitives and non-object values", () => {
    it("returns a primitive value as-is", () => {
      expect(excludeNullsDeep("hello")).toBe("hello");
      expect(excludeNullsDeep(42)).toBe(42);
      expect(excludeNullsDeep(true)).toBe(true);
    });

    it("returns undefined as-is", () => {
      expect(excludeNullsDeep(undefined)).toBeUndefined();
    });
  });

  describe("plain objects", () => {
    it("removes top-level keys with null values", () => {
      const input = { a: 1, b: null, c: "hi" };

      const result = excludeNullsDeep(input);

      expect(result).toEqual({ a: 1, c: "hi" });
    });

    it("preserves keys with undefined values", () => {
      const input = { a: undefined, b: null, c: 0 };

      const result = excludeNullsDeep(input);

      expect(result).toEqual({ a: undefined, c: 0 });
    });

    it("removes nested keys with null values", () => {
      const input = {
        a: 1,
        nested: { b: null, c: "keep" },
      };

      const result = excludeNullsDeep(input);

      expect(result).toEqual({
        a: 1,
        nested: { c: "keep" },
      });
    });

    it("removes deeply nested nulls across multiple levels", () => {
      const input = {
        level1: {
          level2: {
            level3: { keep: "yes", drop: null },
            also: null,
          },
          stays: 10,
        },
      };

      const result = excludeNullsDeep(input);

      expect(result).toEqual({
        level1: {
          level2: { level3: { keep: "yes" } },
          stays: 10,
        },
      });
    });

    it("returns a new object and does not mutate the input", () => {
      const input = { a: null, b: "keep" };
      const copy = { ...input };

      const result = excludeNullsDeep(input);

      expect(result).not.toBe(input);
      expect(input).toEqual(copy);
    });
  });

  describe("arrays", () => {
    it("filters out null elements", () => {
      const input = [1, null, 2, null, 3];

      const result = excludeNullsDeep(input);

      expect(result).toEqual([1, 2, 3]);
    });

    it("preserves undefined elements", () => {
      const input = [1, undefined, null, 3];

      const result = excludeNullsDeep(input);

      expect(result).toEqual([1, undefined, 3]);
    });

    it("recurses into objects inside arrays", () => {
      const input = [
        { a: 1, b: null },
        { c: null, d: "keep" },
      ];

      const result = excludeNullsDeep(input);

      expect(result).toEqual([{ a: 1 }, { d: "keep" }]);
    });
  });

  describe("Maps", () => {
    it("removes entries whose values are null", () => {
      const input = new Map<string, unknown>([
        ["a", 1],
        ["b", null],
        ["c", "hi"],
      ]);

      const result = excludeNullsDeep(input);

      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(
        new Map<string, unknown>([
          ["a", 1],
          ["c", "hi"],
        ]),
      );
    });
  });

  describe("Sets", () => {
    it("removes null values", () => {
      const input = new Set([1, null, 2, null, 3]);

      const result = excludeNullsDeep(input);

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 2, 3]));
    });
  });

  describe("mixed structures", () => {
    it("handles a complex nested structure", () => {
      const input = {
        name: "root",
        empty: null,
        undef: undefined,
        children: [
          {
            name: "child1",
            tag: null,
            meta: { color: "red", size: null },
          },
          null,
          {
            name: "child2",
            data: new Map<string, unknown>([
              ["key1", "val"],
              ["key2", null],
            ]),
          },
        ],
      };

      const result = excludeNullsDeep(input);

      expect(result).toEqual({
        name: "root",
        undef: undefined,
        children: [
          {
            name: "child1",
            meta: { color: "red" },
          },
          {
            name: "child2",
            data: new Map([["key1", "val"]]),
          },
        ],
      });
    });
  });
});
