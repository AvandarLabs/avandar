import { describe, expect, it } from "vitest";
import { excludeUndefinedDeep } from "./excludeUndefinedDeep.ts";

describe("excludeUndefinedDeep", () => {
  describe("primitives and non-object values", () => {
    it("returns a primitive value as-is", () => {
      expect(excludeUndefinedDeep("hello")).toBe("hello");
      expect(excludeUndefinedDeep(42)).toBe(42);
      expect(excludeUndefinedDeep(true)).toBe(true);
    });

    it("returns null as-is", () => {
      expect(excludeUndefinedDeep(null)).toBeNull();
    });
  });

  describe("plain objects", () => {
    it("removes top-level keys with undefined values", () => {
      const input = { a: 1, b: undefined, c: "hi" };

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual({ a: 1, c: "hi" });
    });

    it("preserves keys with null values", () => {
      const input = { a: null, b: undefined, c: 0 };

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual({ a: null, c: 0 });
    });

    it("removes nested keys with undefined values", () => {
      const input = {
        a: 1,
        nested: { b: undefined, c: "keep" },
      };

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual({
        a: 1,
        nested: { c: "keep" },
      });
    });

    it("removes deeply nested undefined across multiple levels", () => {
      const input = {
        level1: {
          level2: {
            level3: { keep: "yes", drop: undefined },
            also: undefined,
          },
          stays: 10,
        },
      };

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual({
        level1: {
          level2: { level3: { keep: "yes" } },
          stays: 10,
        },
      });
    });

    it("returns a new object and does not mutate the input", () => {
      const input = { a: undefined, b: "keep" };
      const copy = { ...input };

      const result = excludeUndefinedDeep(input);

      expect(result).not.toBe(input);
      expect(input).toEqual(copy);
    });
  });

  describe("arrays", () => {
    it("filters out undefined elements", () => {
      const input = [1, undefined, 2, undefined, 3];

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual([1, 2, 3]);
    });

    it("preserves null elements", () => {
      const input = [1, null, undefined, 3];

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual([1, null, 3]);
    });

    it("recurses into objects inside arrays", () => {
      const input = [
        { a: 1, b: undefined },
        { c: undefined, d: "keep" },
      ];

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual([{ a: 1 }, { d: "keep" }]);
    });
  });

  describe("Maps", () => {
    it("removes entries whose values are undefined", () => {
      const input = new Map<string, unknown>([
        ["a", 1],
        ["b", undefined],
        ["c", "hi"],
      ]);

      const result = excludeUndefinedDeep(input);

      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(
        new Map<string, unknown>([
          ["a", 1],
          ["c", "hi"],
        ]),
      );
    });

    it("recurses into Map values that are objects", () => {
      const inner = { x: undefined, y: "keep" };
      const input = new Map<string, unknown>([["entry", inner]]);

      const result = excludeUndefinedDeep(input);
      const resultMap = result as Map<string, unknown>;

      expect(resultMap.get("entry")).toEqual({ y: "keep" });
    });
  });

  describe("Sets", () => {
    it("removes undefined values", () => {
      const input = new Set([1, undefined, 2, undefined, 3]);

      const result = excludeUndefinedDeep(input);

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it("recurses into Set values that are objects", () => {
      const input = new Set([{ a: undefined, b: "keep" }]);

      const result = excludeUndefinedDeep(input);
      const resultSet = result as Set<unknown>;

      expect([...resultSet]).toEqual([{ b: "keep" }]);
    });
  });

  describe("mixed structures", () => {
    it("handles a complex nested structure", () => {
      const input = {
        name: "root",
        empty: undefined,
        nullVal: null,
        children: [
          {
            name: "child1",
            tag: undefined,
            meta: { color: "red", size: undefined },
          },
          undefined,
          {
            name: "child2",
            data: new Map<string, unknown>([
              ["key1", "val"],
              ["key2", undefined],
            ]),
          },
        ],
      };

      const result = excludeUndefinedDeep(input);

      expect(result).toEqual({
        name: "root",
        nullVal: null,
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
