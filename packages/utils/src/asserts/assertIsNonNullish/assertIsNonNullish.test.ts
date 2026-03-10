import { describe, expect, expectTypeOf, it } from "vitest";
import { assertIsNonNullish } from "./assertIsNonNullish.ts";

describe("assertIsNonNullish", () => {
  it("does not throw for non-nullish values", () => {
    expect(() => {
      return assertIsNonNullish("hello");
    }).not.toThrow();
    expect(() => {
      return assertIsNonNullish(0);
    }).not.toThrow();
    expect(() => {
      return assertIsNonNullish(false);
    }).not.toThrow();
    expect(() => {
      return assertIsNonNullish("");
    }).not.toThrow();
    expect(() => {
      return assertIsNonNullish({});
    }).not.toThrow();
    expect(() => {
      return assertIsNonNullish([]);
    }).not.toThrow();
  });

  it("throws for null", () => {
    expect(() => {
      return assertIsNonNullish(null);
    }).toThrow();
  });

  it("throws for undefined", () => {
    expect(() => {
      return assertIsNonNullish(undefined);
    }).toThrow();
  });

  it("throws with default message", () => {
    expect(() => {
      return assertIsNonNullish(null);
    }).toThrow("Expected value to be defined");
    expect(() => {
      return assertIsNonNullish(undefined);
    }).toThrow("Expected value to be defined");
  });

  it("throws with custom message", () => {
    const msg = "user must exist";
    expect(() => {
      return assertIsNonNullish(null, msg);
    }).toThrow(msg);
    expect(() => {
      return assertIsNonNullish(undefined, msg);
    }).toThrow(msg);
  });

  it("throws an Error instance", () => {
    expect(() => {
      return assertIsNonNullish(null);
    }).toThrow(Error);
  });

  describe("type narrowing", () => {
    it("narrows string | null | undefined to string", () => {
      const value: string | null | undefined = "hello";
      assertIsNonNullish(value);
      expectTypeOf(value).toEqualTypeOf<string>();
    });

    it("narrows number | null to number", () => {
      const value: number | null = 42;
      assertIsNonNullish(value);
      expectTypeOf(value).toEqualTypeOf<number>();
    });

    it("narrows number | undefined to number", () => {
      const value: number | undefined = 42;
      assertIsNonNullish(value);
      expectTypeOf(value).toEqualTypeOf<number>();
    });

    it("narrows a complex object union", () => {
      const value: { id: number } | null | undefined = {
        id: 1,
      };
      assertIsNonNullish(value);
      expectTypeOf(value).toEqualTypeOf<{ id: number }>();
    });
  });
});
