import { describe, expect, expectTypeOf, it } from "vitest";
import { assert } from "@utils/asserts/assert/assert.ts";

describe("assert", () => {
  it("does not throw for truthy values", () => {
    expect(() => {
      return assert(true);
    }).not.toThrow();
    expect(() => {
      return assert(1);
    }).not.toThrow();
    expect(() => {
      return assert("non-empty");
    }).not.toThrow();
    expect(() => {
      return assert({});
    }).not.toThrow();
    expect(() => {
      return assert([]);
    }).not.toThrow();
  });

  it("throws for falsy values", () => {
    expect(() => {
      return assert(false);
    }).toThrow();
    expect(() => {
      return assert(0);
    }).toThrow();
    expect(() => {
      return assert("");
    }).toThrow();
    expect(() => {
      return assert(null);
    }).toThrow();
    expect(() => {
      return assert(undefined);
    }).toThrow();
  });

  it("throws with default message", () => {
    expect(() => {
      return assert(false);
    }).toThrow("Condition failed");
  });

  it("throws with custom message", () => {
    const msg = "value must not be null";
    expect(() => {
      return assert(false, msg);
    }).toThrow(msg);
  });

  it("throws an Error instance", () => {
    expect(() => {
      return assert(false);
    }).toThrow(Error);
  });

  describe("type narrowing", () => {
    it("narrows string | undefined to string", () => {
      const value: string | undefined = "hello";
      assert(value);
      expectTypeOf(value).toEqualTypeOf<string>();
    });

    it("narrows number | null to number", () => {
      const value: number | null = 42;
      assert(value !== null);
      expectTypeOf(value).toEqualTypeOf<number>();
    });

    it("narrows unknown to truthy via condition", () => {
      const value: unknown = "test";
      assert(typeof value === "string");
      expectTypeOf(value).toEqualTypeOf<string>();
    });

    it("narrows a union with null and undefined", () => {
      const value: string | null | undefined = "hi";
      assert(value != null);
      expectTypeOf(value).toEqualTypeOf<string>();
    });
  });
});
