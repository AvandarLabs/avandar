import { describe, expect, it } from "vitest";
import { isPrimitive } from "@utils/guards/isPrimitive/isPrimitive.ts";

describe("isPrimitive", () => {
  describe("returns true for primitive types", () => {
    it("returns true for a string", () => {
      expect(isPrimitive("hello")).toBe(true);
      expect(isPrimitive("")).toBe(true);
    });

    it("returns true for a number", () => {
      expect(isPrimitive(42)).toBe(true);
      expect(isPrimitive(0)).toBe(true);
      expect(isPrimitive(NaN)).toBe(true);
      expect(isPrimitive(Infinity)).toBe(true);
    });

    it("returns true for a boolean", () => {
      expect(isPrimitive(true)).toBe(true);
      expect(isPrimitive(false)).toBe(true);
    });

    it("returns true for a symbol", () => {
      expect(isPrimitive(Symbol("test"))).toBe(true);
    });

    it("returns true for undefined", () => {
      expect(isPrimitive(undefined)).toBe(true);
    });

    it("returns true for null", () => {
      expect(isPrimitive(null)).toBe(true);
    });
  });

  describe("returns false for non-primitive types", () => {
    it("returns false for a plain object", () => {
      expect(isPrimitive({})).toBe(false);
      expect(isPrimitive({ a: 1 })).toBe(false);
    });

    it("returns false for an array", () => {
      expect(isPrimitive([])).toBe(false);
      expect(isPrimitive([1, 2, 3])).toBe(false);
    });

    it("returns false for a function", () => {
      expect(isPrimitive(() => {})).toBe(false);
    });

    it("returns false for a Date", () => {
      expect(isPrimitive(new Date())).toBe(false);
    });

    it("returns false for a Map", () => {
      expect(isPrimitive(new Map())).toBe(false);
    });

    it("returns false for a Set", () => {
      expect(isPrimitive(new Set())).toBe(false);
    });

    it("returns false for a RegExp", () => {
      expect(isPrimitive(/abc/)).toBe(false);
    });
  });
});
