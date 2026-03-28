import { describe, expect, expectTypeOf, it } from "vitest";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral.ts";
import type { Expect, IsEqual } from "@utils/types/test-utilities.types.ts";

describe("matchLiteral", () => {
  it("returns the value for a matching string key", () => {
    const result = matchLiteral("a", {
      a: "valueA",
      b: "valueB",
    });
    expect(result).toBe("valueA");
  });

  it("returns the value for a matching number key", () => {
    const result = matchLiteral(1, {
      1: "one",
      2: "two",
    });
    expect(result).toBe("one");
  });

  it("calls the function and returns result when value is a function", () => {
    const result = matchLiteral("x", {
      x: (key) => {
        return `computed-${key}`;
      },
    });
    expect(result).toBe("computed-x");
  });

  it("returns _otherwise value when key is not in values", () => {
    const result = matchLiteral("c", {
      a: "valueA",
      b: "valueB",
      _otherwise: "fallback",
      // Key "c" omitted to test _otherwise path at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result).toBe("fallback");
  });

  it("calls _otherwise function when key is not in values", () => {
    const result = matchLiteral("z", {
      a: "valueA",
      _otherwise: (key: string) => {
        return `fallback-${key}`;
      },
      // Key "z" omitted to test _otherwise path at runtime
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(result).toBe("fallback-z");
  });

  it("throws when key is not in values and no _otherwise", () => {
    expect(() => {
      return matchLiteral("missing", {
        a: "valueA",
        b: "valueB",
        // Intentionally omit "missing" and _otherwise to test error path
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }).toThrow("No matching value found for input: missing");
  });

  it("prefers direct key match over _otherwise", () => {
    const result = matchLiteral("a", {
      a: "direct",
      _otherwise: "fallback",
    });
    expect(result).toBe("direct");
  });
});

// ============================================================================
// Type tests
// ============================================================================

describe("matchLiteral type tests", () => {
  it("refines function parameter to narrowed key type", () => {
    const result = matchLiteral("a" as "a" | "b", {
      a: (key) => {
        // key is narrowed to "a" here - assigning to "a" literal proves it.
        const _narrowed: "a" = key;
        return _narrowed;
      },
      b: (key) => {
        // key is narrowed to "b" here.
        const _narrowed: "b" = key;
        return _narrowed;
      },
    });
    expectTypeOf(result).toEqualTypeOf<"a" | "b">();
  });
});

// Compile-time type assertions for function parameter narrowing.
const _exhaustiveWithFunctions = matchLiteral("a" as "a" | "b", {
  a: (key) => {
    key satisfies "a";
    return "resultA" as const;
  },
  b: (key) => {
    key satisfies "b";
    return "resultB" as const;
  },
});

type _ExhaustiveResult = typeof _exhaustiveWithFunctions;

// @ts-expect-error allow unused variable declaration.
type _TypeTests = [Expect<IsEqual<_ExhaustiveResult, "resultA" | "resultB">>];

// Type test: non-exhaustive match should cause a type error
// @ts-expect-error - Match must be exhaustive; key "c" is missing.
const _nonExhaustive = matchLiteral("a" as "a" | "b" | "c", {
  a: "valueA",
  b: "valueB",
});
