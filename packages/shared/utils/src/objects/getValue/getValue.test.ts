import { describe, expect, it } from "vitest";
import { getValue } from "@utils/objects/getValue/getValue.ts";

describe("getValue", () => {
  describe("top-level keys", () => {
    it("gets a string value", () => {
      const obj = { name: "Alice", age: 30 };

      const result = getValue(obj, "name");

      expect(result).toBe("Alice");
    });

    it("gets a numeric value", () => {
      const obj = { name: "Alice", age: 30 };

      const result = getValue(obj, "age");

      expect(result).toBe(30);
    });

    it("gets an undefined value without throwing", () => {
      const obj: { a: number | undefined } = {
        a: undefined,
      };

      const result = getValue(obj, "a");

      expect(result).toBeUndefined();
    });

    it("gets a null value", () => {
      const obj = { a: null, b: 2 };

      const result = getValue(obj, "a");

      expect(result).toBeNull();
    });
  });

  describe("nested keys via dot notation", () => {
    it("gets a value one level deep", () => {
      const obj = { meta: { color: "red" } };

      const result = getValue(obj, "meta.color");

      expect(result).toBe("red");
    });

    it("gets a value two levels deep", () => {
      const obj = {
        a: { b: { c: 42 } },
      };

      const result = getValue(obj, "a.b.c");

      expect(result).toBe(42);
    });

    it("gets an intermediate object", () => {
      const obj = {
        a: { b: { c: 42 } },
      };

      const result = getValue(obj, "a.b");

      expect(result).toEqual({ c: 42 });
    });
  });

  describe("array access", () => {
    it("gets an element from a top-level array", () => {
      const arr = ["a", "b", "c"];

      const result = getValue(arr, "1");

      expect(result).toBe("b");
    });

    it("gets an element from a nested array", () => {
      const obj = { items: ["x", "y", "z"] };

      const result = getValue(obj, "items.1");

      expect(result).toBe("y");
    });

    it("gets a property from an object inside an array", () => {
      const obj = {
        people: [{ name: "Alice" }, { name: "Bob" }],
      };

      const result = getValue(obj, "people.0.name");

      expect(result).toBe("Alice");
    });
  });

  describe("error handling", () => {
    it("throws when a top-level key does not exist", () => {
      const obj = { a: 1 };

      expect(() => {
        getValue(obj, "b" as keyof typeof obj);
      }).toThrow("not found in object");
    });

    it("throws when a nested key does not exist", () => {
      const obj = { a: { b: 1 } };

      expect(() => {
        getValue(obj, "a.c" as "a.b");
      }).toThrow("not found in object");
    });

    it("throws when traversing through a primitive value", () => {
      const obj = { a: "hello" };

      expect(() => {
        getValue(obj, "a.b" as unknown as keyof typeof obj);
      }).toThrow("primitive value");
    });

    it("throws when an array index is out of bounds", () => {
      const arr = ["a", "b"];

      expect(() => {
        getValue(arr, "5" as "0");
      }).toThrow("not found in array");
    });
  });
});
