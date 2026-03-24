import { describe, expect, expectTypeOf, it } from "vitest";
import { assertHasDefinedProps } from "./assertHasDefinedProps.ts";

describe("assertHasDefinedProps", () => {
  describe("runtime", () => {
    it("throws when a checked property is missing", () => {
      const obj: { a?: number } = {};

      expect(() => {
        assertHasDefinedProps(obj, "a");
      }).toThrow("Expected undefined to have defined properties: a");
    });

    it("throws when a checked property is undefined", () => {
      const obj: { a?: number } = { a: undefined };

      expect(() => {
        assertHasDefinedProps(obj, "a");
      }).toThrow("Expected undefined to have defined properties: a");
    });

    it("throws when a listed property is missing or undefined", () => {
      const obj: { a?: number; b?: string } = { a: 1 };

      expect(() => {
        assertHasDefinedProps(obj, ["a", "b"]);
      }).toThrow("Expected undefined to have defined properties: a, b");
    });

    it("does not throw for defined falsy values and null", () => {
      const obj = { a: 0, b: "", c: false, d: null };

      expect(() => {
        assertHasDefinedProps(obj, ["a", "b", "c", "d"]);
      }).not.toThrow();
    });

    it("formats errors with options.name when provided", () => {
      const obj: { name?: string } = {};

      expect(() => {
        assertHasDefinedProps(obj, "name", { name: "row" });
      }).toThrow("Expected row to have defined properties: name");
    });

    it("uses the object label when the third argument is a string", () => {
      const obj: { x?: number } = {};

      expect(() => {
        assertHasDefinedProps(obj, "x", "unused");
      }).toThrow("Expected object to have defined properties: x");
    });

    it("does not throw when the keys array is empty", () => {
      const obj = { a: undefined };

      expect(() => {
        assertHasDefinedProps(obj, []);
      }).not.toThrow();
    });
  });

  describe("type narrowing", () => {
    it("narrows one optional key to a defined property", () => {
      const obj: { name?: string } = { name: "Ada" };
      assertHasDefinedProps(obj, "name");
      expectTypeOf(obj.name).toEqualTypeOf<string>();
    });

    it("narrows several optional keys at once", () => {
      const obj: { a?: string; b?: number } = { a: "x", b: 2 };
      assertHasDefinedProps(obj, ["a", "b"]);
      expectTypeOf(obj.a).toEqualTypeOf<string>();
      expectTypeOf(obj.b).toEqualTypeOf<number>();
    });

    it("preserves null in the property type after excluding undefined", () => {
      const obj: { n?: string | null } = { n: null };
      assertHasDefinedProps(obj, "n");
      expectTypeOf(obj.n).toEqualTypeOf<string | null>();
    });
  });
});
