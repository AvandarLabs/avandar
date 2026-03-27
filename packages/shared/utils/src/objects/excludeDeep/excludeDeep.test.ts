import { describe, expect, it } from "vitest";
import { isNull } from "@utils/guards/isNull/isNull.ts";
import { isUndefined } from "@utils/guards/isUndefined/isUndefined.ts";
import { excludeDeep } from "@utils/objects/excludeDeep/excludeDeep.ts";

function _isNumber(value: unknown): value is number {
  return typeof value === "number";
}

describe("excludeDeep", () => {
  describe("primitives and non-object values", () => {
    it("returns a primitive value as-is", () => {
      expect(excludeDeep("hello", isNull)).toBe("hello");
      expect(excludeDeep(42, isNull)).toBe(42);
      expect(excludeDeep(true, isNull)).toBe(true);
    });

    it("returns null as-is when the guard does not match null", () => {
      expect(excludeDeep(null, isUndefined)).toBeNull();
    });

    it("returns undefined as-is when the guard does not match undefined", () => {
      expect(excludeDeep(undefined, isNull)).toBeUndefined();
    });
  });

  describe("plain objects", () => {
    it("removes top-level keys whose values match the guard", () => {
      const input = { a: 1, b: null, c: "hi" };

      const result = excludeDeep(input, isNull);

      expect(result).toEqual({ a: 1, c: "hi" });
    });

    it("removes nested keys whose values match the guard", () => {
      const input = {
        a: 1,
        nested: { b: null, c: "keep" },
      };

      const result = excludeDeep(input, isNull);

      expect(result).toEqual({
        a: 1,
        nested: { c: "keep" },
      });
    });

    it("removes deeply nested keys across multiple levels", () => {
      const input = {
        level1: {
          level2: {
            level3: { keep: "yes", drop: undefined },
            also: undefined,
          },
          stays: 10,
        },
      };

      const result = excludeDeep(input, isUndefined);

      expect(result).toEqual({
        level1: {
          level2: { level3: { keep: "yes" } },
          stays: 10,
        },
      });
    });

    it("returns an empty object when all keys are excluded", () => {
      const input = { a: 1, b: 2, c: 3 };

      const result = excludeDeep(input, _isNumber);

      expect(result).toEqual({});
    });

    it("returns a new object and does not mutate the input", () => {
      const input = { a: null, b: "keep" };
      const copy = { ...input };

      const result = excludeDeep(input, isNull);

      expect(result).not.toBe(input);
      expect(input).toEqual(copy);
    });
  });

  describe("arrays", () => {
    it("filters out array elements matching the guard", () => {
      const input = [1, null, 2, null, 3];

      const result = excludeDeep(input, isNull);

      expect(result).toEqual([1, 2, 3]);
    });

    it("recurses into array elements that are objects", () => {
      const input = [
        { a: 1, b: null },
        { c: null, d: "keep" },
      ];

      const result = excludeDeep(input, isNull);

      expect(result).toEqual([{ a: 1 }, { d: "keep" }]);
    });

    it("recurses into nested arrays", () => {
      const input = [[null, 1], [2, null], [null]];

      const result = excludeDeep(input, isNull);

      expect(result).toEqual([[1], [2], []]);
    });

    it("handles arrays nested inside objects", () => {
      const input = {
        items: [null, { name: "a", tag: null }, "b"],
      };

      const result = excludeDeep(input, isNull);

      expect(result).toEqual({
        items: [{ name: "a" }, "b"],
      });
    });

    it("returns a new array instance", () => {
      const input = [1, 2, 3];

      const result = excludeDeep(input, isNull);

      expect(result).not.toBe(input);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("Maps", () => {
    it("removes entries whose values match the guard", () => {
      const input = new Map<string, unknown>([
        ["a", 1],
        ["b", null],
        ["c", "hi"],
      ]);

      const result = excludeDeep(input, isNull);

      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(
        new Map<string, unknown>([
          ["a", 1],
          ["c", "hi"],
        ]),
      );
    });

    it("recurses into Map values that are objects", () => {
      const inner = { x: null, y: "keep" };
      const input = new Map<string, unknown>([["entry", inner]]);

      const result = excludeDeep(input, isNull);
      const resultMap = result as Map<string, unknown>;

      expect(resultMap.get("entry")).toEqual({ y: "keep" });
    });

    it("returns a new Map instance", () => {
      const input = new Map([["a", 1]]);

      const result = excludeDeep(input, isNull);

      expect(result).not.toBe(input);
    });
  });

  describe("Sets", () => {
    it("removes values matching the guard", () => {
      const input = new Set([1, null, 2, null, 3]);

      const result = excludeDeep(input, isNull);

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it("recurses into Set values that are objects", () => {
      const input = new Set([{ a: null, b: "keep" }]);

      const result = excludeDeep(input, isNull);
      const resultSet = result as Set<unknown>;

      expect([...resultSet]).toEqual([{ b: "keep" }]);
    });

    it("returns a new Set instance", () => {
      const input = new Set([1, 2]);

      const result = excludeDeep(input, isNull);

      expect(result).not.toBe(input);
    });
  });

  describe("class instances and other objects", () => {
    it("returns class instances as-is without traversing them", () => {
      class MyClass {
        value: null = null;
      }
      const instance = new MyClass();

      const result = excludeDeep(instance, isNull);

      expect(result).toBe(instance);
      expect((result as MyClass).value).toBeNull();
    });

    it("returns Date objects as-is", () => {
      const date = new Date("2025-01-01");

      const result = excludeDeep(date, isNull);

      expect(result).toBe(date);
    });
  });

  describe("mixed structures", () => {
    it("handles a complex nested structure", () => {
      const input = {
        name: "root",
        empty: null,
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

      const result = excludeDeep(input, isNull);

      expect(result).toEqual({
        name: "root",
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

    it("works with a custom type guard", () => {
      const isEmptyString = (value: unknown): value is "" => {
        return value === "";
      };

      const input = {
        a: "",
        b: "hello",
        c: { d: "", e: "world" },
        f: ["", "keep", ""],
      };

      const result = excludeDeep(input, isEmptyString);

      expect(result).toEqual({
        b: "hello",
        c: { e: "world" },
        f: ["keep"],
      });
    });
  });
});
