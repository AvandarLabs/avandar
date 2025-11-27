import { capitalize } from "$/lib/utils/strings/capitalize";
import { describe, expect, it } from "vitest";
import type { Expect, IsEqual } from "@/lib/types/testUtilityTypes";

describe("capitalize", () => {
  it("capitalizes the first letter of a lowercase word", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("returns the same string if the first letter is already capitalized", () => {
    expect(capitalize("World")).toBe("World");
  });

  it("capitalizes the first character of a sentence", () => {
    expect(capitalize("test sentence")).toBe("Test sentence");
  });

  it("handles single character strings", () => {
    expect(capitalize("a")).toBe("A");
    expect(capitalize("Z")).toBe("Z");
  });

  it("handles empty strings", () => {
    expect(capitalize("")).toBe("");
  });

  it("does not alter non-letter first characters", () => {
    expect(capitalize("1test")).toBe("1test");
    expect(capitalize("_underscore")).toBe("_underscore");
    expect(capitalize(" test")).toBe(" test");
  });

  it("works with special characters", () => {
    expect(capitalize("ßeta")).toBe("SSeta"); // in JS, "ß".toUpperCase() is "SS"
  });
});

// ============================================================================
// Type tests
// ============================================================================

const hello = capitalize("hello");
const Hello = capitalize("Hello");

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  Expect<IsEqual<typeof hello, "Hello">>,
  Expect<IsEqual<typeof Hello, "Hello">>,
];
