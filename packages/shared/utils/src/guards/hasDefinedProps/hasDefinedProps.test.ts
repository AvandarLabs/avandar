import { describe, expect, it } from "vitest";
import { hasDefinedProps } from "@utils/guards/hasDefinedProps/hasDefinedProps.ts";

describe("hasDefinedProps", () => {
  describe("single key as string", () => {
    it("returns true when the property exists and is defined", () => {
      const obj = { name: "Alice", age: 30 };

      expect(hasDefinedProps(obj, "name")).toBe(true);
    });

    it("returns false when the property is undefined", () => {
      const obj: { name?: string } = {
        name: undefined,
      };

      expect(hasDefinedProps(obj, "name")).toBe(false);
    });

    it("returns false when the property does not exist", () => {
      const obj: { name?: string } = {};

      expect(hasDefinedProps(obj, "name")).toBe(false);
    });

    it("returns true for falsy but defined values", () => {
      const obj = { count: 0, label: "", flag: false };

      expect(hasDefinedProps(obj, "count")).toBe(true);
      expect(hasDefinedProps(obj, "label")).toBe(true);
      expect(hasDefinedProps(obj, "flag")).toBe(true);
    });

    it("returns true when value is null", () => {
      const obj = { a: null };

      expect(hasDefinedProps(obj, "a")).toBe(true);
    });
  });

  describe("multiple keys as array", () => {
    it("returns true when all properties are defined", () => {
      const obj = { a: 1, b: "hi", c: true };

      expect(hasDefinedProps(obj, ["a", "b", "c"])).toBe(true);
    });

    it("returns false when one property is undefined", () => {
      const obj: { a: number; b?: string } = {
        a: 1,
        b: undefined,
      };

      expect(hasDefinedProps(obj, ["a", "b"])).toBe(false);
    });

    it("returns false when one property does not exist", () => {
      const obj: { a: number; b?: string } = { a: 1 };

      expect(hasDefinedProps(obj, ["a", "b"])).toBe(false);
    });

    it("returns true for an empty keys array", () => {
      const obj = { a: undefined };

      expect(hasDefinedProps(obj, [])).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("works with an empty object", () => {
      const obj: { a?: number } = {};

      expect(hasDefinedProps(obj, "a")).toBe(false);
    });

    it("distinguishes missing keys from undefined values", () => {
      const obj: Record<string, unknown> = { a: undefined };

      expect(hasDefinedProps(obj, "a")).toBe(false);
      expect(hasDefinedProps(obj, "b" as "a")).toBe(false);
    });
  });
});
