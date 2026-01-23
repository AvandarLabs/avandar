import { describe, expect, it } from "vitest";
import { isSnakeCase } from "./isSnakeCase";

describe("isSnakeCase", () => {
  it("returns a validator function", () => {
    const validator = isSnakeCase();

    expect(typeof validator).toBe("function");
  });

  it("returns true for valid snake_case values", () => {
    const validator = isSnakeCase();

    expect(validator("a")).toBe(true);
    expect(validator("abc")).toBe(true);
    expect(validator("a_b")).toBe(true);
    expect(validator("a1")).toBe(true);
    expect(validator("a1_b2")).toBe(true);
    expect(validator("a_b_c")).toBe(true);
    expect(validator("a__b")).toBe(true);
    expect(validator("a_")).toBe(true);
  });

  it("returns the default error message for invalid values", () => {
    const validator = isSnakeCase();

    expect(validator("")).toBe("Value must be snake_case.");
    expect(validator("_a")).toBe("Value must be snake_case.");
    expect(validator("A")).toBe("Value must be snake_case.");
    expect(validator("aB")).toBe("Value must be snake_case.");
    expect(validator("1a")).toBe("Value must be snake_case.");
    expect(validator("a-b")).toBe("Value must be snake_case.");
    expect(validator("a b")).toBe("Value must be snake_case.");
  });

  it("returns the custom error message for invalid values", () => {
    const errorMessage = "Custom error message.";
    const validator = isSnakeCase(errorMessage);

    expect(validator("Not_Snake")).toBe(errorMessage);
  });

  it("still returns true for valid values with a custom message", () => {
    const validator = isSnakeCase("Custom error message.");

    expect(validator("abc_def")).toBe(true);
  });
});
