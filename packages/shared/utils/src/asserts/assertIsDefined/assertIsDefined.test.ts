import { describe, expect, expectTypeOf, it } from "vitest";
import { assertIsDefined } from "./assertIsDefined.ts";

describe("assertIsDefined", () => {
  it("does not throw for defined values", () => {
    expect(() => {
      return assertIsDefined("hello");
    }).not.toThrow();
    expect(() => {
      return assertIsDefined(0);
    }).not.toThrow();
    expect(() => {
      return assertIsDefined(false);
    }).not.toThrow();
    expect(() => {
      return assertIsDefined("");
    }).not.toThrow();
    expect(() => {
      return assertIsDefined(null);
    }).not.toThrow();
    expect(() => {
      return assertIsDefined({});
    }).not.toThrow();
    expect(() => {
      return assertIsDefined([]);
    }).not.toThrow();
  });

  it("throws for undefined", () => {
    expect(() => {
      return assertIsDefined(undefined);
    }).toThrow();
  });

  it("throws with default message", () => {
    expect(() => {
      return assertIsDefined(undefined);
    }).toThrow("Expected value to be defined. Received undefined.");
  });

  it("throws with custom message", () => {
    const msg = "id is required";
    expect(() => {
      return assertIsDefined(undefined, msg);
    }).toThrow(msg);
  });

  it("throws an Error instance", () => {
    expect(() => {
      return assertIsDefined(undefined);
    }).toThrow(Error);
  });

  it("throws with custom name", () => {
    expect(() => {
      return assertIsDefined(undefined, { name: "id" });
    }).toThrow("Expected id to be defined. Received undefined.");
  });

  describe("type narrowing", () => {
    it("narrows string | undefined to string", () => {
      const value: string | undefined = "hello";
      assertIsDefined(value);
      expectTypeOf(value).toEqualTypeOf<string>();
    });

    it("narrows number | undefined to number", () => {
      const value: number | undefined = 42;
      assertIsDefined(value);
      expectTypeOf(value).toEqualTypeOf<number>();
    });

    it("preserves null in the union", () => {
      const value = null as string | null | undefined;
      assertIsDefined(value);
      expectTypeOf(value).toEqualTypeOf<string | null>();
    });

    it("narrows a complex union", () => {
      const value: { id: number } | undefined = { id: 1 };
      assertIsDefined(value);
      expectTypeOf(value).toEqualTypeOf<{ id: number }>();
    });
  });
});
