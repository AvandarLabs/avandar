import { describe, expect, it } from "vitest";
import { setValue } from "./setValue.ts";

describe("setValue", () => {
  describe("top-level keys", () => {
    it("sets a string value", () => {
      const obj = { name: "Alice", age: 30 };

      const result = setValue(obj, "name", "Bob");

      expect(result).toEqual({ name: "Bob", age: 30 });
    });

    it("sets a numeric value", () => {
      const obj = { name: "Alice", age: 30 };

      const result = setValue(obj, "age", 25);

      expect(result).toEqual({ name: "Alice", age: 25 });
    });

    it("does not mutate the original object", () => {
      const obj = { a: 1, b: 2 };
      const copy = { ...obj };

      setValue(obj, "a", 99);

      expect(obj).toEqual(copy);
    });

    it("returns a new object reference", () => {
      const obj = { a: 1 };

      const result = setValue(obj, "a", 2);

      expect(result).not.toBe(obj);
    });
  });

  describe("nested keys via dot notation", () => {
    it("sets a value one level deep", () => {
      const obj = { meta: { color: "red" } };

      const result = setValue(obj, "meta.color", "blue");

      expect(result).toEqual({
        meta: { color: "blue" },
      });
    });

    it("sets a value two levels deep", () => {
      const obj = { a: { b: { c: 1 } } };

      const result = setValue(obj, "a.b.c", 42);

      expect(result).toEqual({ a: { b: { c: 42 } } });
    });

    it("does not mutate nested objects", () => {
      const inner = { c: 1 };
      const obj = { a: { b: inner } };

      setValue(obj, "a.b.c", 99);

      expect(inner.c).toBe(1);
    });

    it("preserves sibling keys at each level", () => {
      const obj = {
        a: { b: 1, keep: "yes" },
        other: true,
      };

      const result = setValue(obj, "a.b", 99);

      expect(result).toEqual({
        a: { b: 99, keep: "yes" },
        other: true,
      });
    });
  });

  describe("array access", () => {
    it("sets an element in a top-level array", () => {
      const arr = ["a", "b", "c"] as string[];

      const result = setValue(arr, "1", "replaced");

      expect(result).toEqual(["a", "replaced", "c"]);
    });

    it("does not mutate the original array", () => {
      const arr = ["a", "b", "c"] as string[];
      const copy = [...arr];

      setValue(arr, "0", "x");

      expect(arr).toEqual(copy);
    });

    it("sets a value inside an object nested in an array", () => {
      const obj = {
        items: [{ name: "Alice" }, { name: "Bob" }],
      };

      const result = setValue(obj, "items.0.name", "Carol");

      expect(result).toEqual({
        items: [{ name: "Carol" }, { name: "Bob" }],
      });
    });

    it("preserves other array elements", () => {
      const obj = {
        list: [10, 20, 30] as number[],
      };

      const result = setValue(obj, "list.1", 99);

      expect(result).toEqual({ list: [10, 99, 30] });
    });
  });

  describe("error handling", () => {
    it("throws when traversing through a primitive", () => {
      const obj = { a: "hello" };

      expect(() => {
        setValue(
          obj,
          "a.b" as unknown as keyof typeof obj,
          "x" as unknown as string,
        );
      }).toThrow("primitive value");
    });
  });
});
