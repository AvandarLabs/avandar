import { describe, expect, it } from "vitest";
import { assertIsNonEmptyArray } from "./assertIsNonEmptyArray";

describe("assertIsNonEmptyArray", () => {
  it("does not throw when value is a non-empty array", () => {
    expect(() => {
      return assertIsNonEmptyArray([1, 2, 3]);
    }).not.toThrow();
    expect(() => {
      return assertIsNonEmptyArray(["a"]);
    }).not.toThrow();
    expect(() => {
      return assertIsNonEmptyArray([true, false]);
    }).not.toThrow();
  });

  it("throws when value is undefined", () => {
    expect(() => {
      return assertIsNonEmptyArray(undefined);
    }).toThrow("Expected value to be a non-empty array");
  });

  it("throws when value is null", () => {
    expect(() => {
      return assertIsNonEmptyArray(null);
    }).toThrow("Expected value to be a non-empty array");
  });

  it("throws when value is an empty array", () => {
    expect(() => {
      return assertIsNonEmptyArray([]);
    }).toThrow("Expected value to be a non-empty array");
  });

  it("throws with custom error message when provided", () => {
    const customMsg = "Custom error message";
    expect(() => {
      return assertIsNonEmptyArray(undefined, customMsg);
    }).toThrow(customMsg);
    expect(() => {
      return assertIsNonEmptyArray(null, customMsg);
    }).toThrow(customMsg);
    expect(() => {
      return assertIsNonEmptyArray([], customMsg);
    }).toThrow(customMsg);
  });
});
